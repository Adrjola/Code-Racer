package org.coderacer.backend.integration;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.UUID;
import org.coderacer.backend.enums.Category;
import org.coderacer.backend.enums.Difficulty;
import org.coderacer.backend.enums.UserRole;
import org.coderacer.backend.model.CodeSnippet;
import org.coderacer.backend.model.SoloAttempt;
import org.coderacer.backend.model.User;
import org.coderacer.backend.repository.CodeSnippetRepository;
import org.coderacer.backend.repository.SoloAttemptRepository;
import org.coderacer.backend.repository.UserRepository;
import org.coderacer.backend.security.JwtTokenService;
import org.coderacer.backend.support.IntegrationTest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

/** Drives the ranking route over real HTTP, the way the result screen does. */
@IntegrationTest
class SoloAttemptRankingHttpIntegrationTest {

  @Autowired private TestRestTemplate restTemplate;
  @Autowired private SoloAttemptRepository attemptRepository;
  @Autowired private CodeSnippetRepository codeSnippetRepository;
  @Autowired private UserRepository userRepository;
  @Autowired private JwtTokenService jwtTokenService;

  private final Instant now = Instant.parse("2026-01-01T00:00:00Z");

  @BeforeEach
  @AfterEach
  void reset() {
    attemptRepository.deleteAll();
    codeSnippetRepository.deleteAll();
    userRepository.deleteAll();
  }

  @Test
  void returnsTheRankingForTheCallersOwnFinishedRace() {
    User player = saveUser("player");
    CodeSnippet snippet = saveSnippet();
    SoloAttempt run = completed(player, snippet, 1_284L, 280);

    ResponseEntity<String> response = getRanking(run.getId(), player);

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    assertThat(response.getBody())
        .contains("\"newPersonalBest\":true")
        .contains("\"attemptRank\":1")
        .contains("\"globalRank\":1")
        .contains("\"previousGlobalRank\":null");
  }

  @Test
  void reportsTheRankThePlayerKeepsAfterASlowerRepeat() {
    User player = saveUser("player");
    CodeSnippet snippet = saveSnippet();
    completed(saveUser("rival"), snippet, 1_000L, 500);
    completed(player, snippet, 2_000L, 400);
    SoloAttempt slower = completed(player, snippet, 5_000L, 200);

    ResponseEntity<String> response = getRanking(slower.getId(), player);

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    assertThat(response.getBody())
        .contains("\"newPersonalBest\":false")
        .contains("\"attemptRank\":2")
        .contains("\"globalRank\":2")
        .contains("\"previousBestDurationMs\":2000");
  }

  @Test
  void anotherPlayersAttemptIsNotReadable() {
    User player = saveUser("player");
    CodeSnippet snippet = saveSnippet();
    SoloAttempt run = completed(player, snippet, 1_000L, 500);

    ResponseEntity<String> response = getRanking(run.getId(), saveUser("nosy"));

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
  }

  @Test
  void requiresAToken() {
    User player = saveUser("player");
    CodeSnippet snippet = saveSnippet();
    SoloAttempt run = completed(player, snippet, 1_000L, 500);

    ResponseEntity<String> response =
        restTemplate.getForEntity("/api/solo-attempts/" + run.getId() + "/ranking", String.class);

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
  }

  private ResponseEntity<String> getRanking(UUID attemptId, User caller) {
    HttpHeaders headers = new HttpHeaders();
    headers.setBearerAuth(jwtTokenService.createAccessToken(caller));
    return restTemplate.exchange(
        "/api/solo-attempts/" + attemptId + "/ranking",
        HttpMethod.GET,
        new HttpEntity<Void>(headers),
        String.class);
  }

  private SoloAttempt completed(User user, CodeSnippet snippet, long durationMs, int cpm) {
    SoloAttempt attempt = new SoloAttempt(user, snippet, Difficulty.EASY, now);
    attempt.activate();
    attempt.complete(now.plusMillis(durationMs), durationMs, cpm);
    return attemptRepository.saveAndFlush(attempt);
  }

  private CodeSnippet saveSnippet() {
    String source = UUID.randomUUID().toString();
    return codeSnippetRepository.saveAndFlush(
        new CodeSnippet(source, source, sha256Hex(source), Difficulty.EASY, Category.JAVA));
  }

  private String sha256Hex(String value) {
    try {
      byte[] digest =
          java.security.MessageDigest.getInstance("SHA-256")
              .digest(value.getBytes(java.nio.charset.StandardCharsets.UTF_8));
      return java.util.HexFormat.of().formatHex(digest);
    } catch (java.security.NoSuchAlgorithmException e) {
      throw new IllegalStateException(e);
    }
  }

  private User saveUser(String username) {
    User user = new User();
    user.setEmail(username + UUID.randomUUID() + "@example.com");
    user.setUsername(username + UUID.randomUUID().toString().substring(0, 8));
    user.setPasswordHash("hashed-password");
    user.setRole(UserRole.USER);
    user.setEmailVerified(true);
    user.setDeleted(false);
    user.setTokenValidFrom(Instant.EPOCH);
    return userRepository.saveAndFlush(user);
  }
}
