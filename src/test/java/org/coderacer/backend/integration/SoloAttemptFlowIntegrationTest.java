package org.coderacer.backend.integration;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.HexFormat;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.coderacer.backend.enums.Difficulty;
import org.coderacer.backend.enums.UserRole;
import org.coderacer.backend.model.Category;
import org.coderacer.backend.model.CodeSnippet;
import org.coderacer.backend.model.SoloAttempt;
import org.coderacer.backend.model.User;
import org.coderacer.backend.repository.CategoryRepository;
import org.coderacer.backend.repository.CodeSnippetRepository;
import org.coderacer.backend.repository.SoloAttemptRepository;
import org.coderacer.backend.repository.UserRepository;
import org.coderacer.backend.security.JwtTokenService;
import org.coderacer.backend.support.IntegrationTest;
import org.coderacer.backend.support.MutableClock;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.TestRestTemplate;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

@IntegrationTest
class SoloAttemptFlowIntegrationTest {

  @TestConfiguration
  static class ClockTestConfig {
    @Bean
    @Primary
    MutableClock mutableClock() {
      return new MutableClock(Instant.now(), ZoneOffset.UTC);
    }
  }

  @Autowired private TestRestTemplate restTemplate;
  @Autowired private UserRepository userRepository;
  @Autowired private CodeSnippetRepository codeSnippetRepository;
  @Autowired private CategoryRepository categoryRepository;
  @Autowired private SoloAttemptRepository soloAttemptRepository;
  @Autowired private MutableClock clock;
  @Autowired private JwtTokenService jwtTokenService;

  private User newUser(String username) {
    User user = new User();
    user.setEmail(username + "@example.com");
    user.setUsername(username);
    user.setPasswordHash("hashed-password");
    user.setRole(UserRole.USER);
    user.setEmailVerified(true);
    user.setDeleted(false);
    return userRepository.saveAndFlush(user);
  }

  private CodeSnippet newSnippet(String content) {
    Category category = new Category();
    category.setName("Category " + UUID.randomUUID());
    category.setActive(true);
    category = categoryRepository.saveAndFlush(category);
    return codeSnippetRepository.saveAndFlush(
        new CodeSnippet(
            "Title", content, sha256Hex(content + UUID.randomUUID()), Difficulty.EASY, category));
  }

  private CodeSnippet newDeletedSnippet(String content) {
    CodeSnippet snippet = newSnippet(content);
    snippet.softDelete();
    return codeSnippetRepository.saveAndFlush(snippet);
  }

  private static String sha256Hex(String value) {
    try {
      return HexFormat.of()
          .formatHex(
              MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
    } catch (NoSuchAlgorithmException e) {
      throw new IllegalStateException(e);
    }
  }

  private HttpHeaders headersFor(User user) {
    return headersFor(user, user);
  }

  private HttpHeaders headersFor(User tokenUser, User spoofedHeaderUser) {
    HttpHeaders headers = new HttpHeaders();
    headers.setContentType(MediaType.APPLICATION_JSON);
    headers.set("X-User-Id", spoofedHeaderUser.getId().toString());
    headers.setBearerAuth(jwtTokenService.createAccessToken(tokenUser));
    return headers;
  }

  @SuppressWarnings("unchecked")
  private Map<String, Object> data(ResponseEntity<Map> response) {
    return (Map<String, Object>) response.getBody().get("data");
  }

  private UUID startAttempt(User user, CodeSnippet snippet) {
    ResponseEntity<Map> response =
        restTemplate.exchange(
            "/api/solo-attempts",
            HttpMethod.POST,
            new HttpEntity<>("{\"codeSnippetId\":\"" + snippet.getId() + "\"}", headersFor(user)),
            Map.class);
    return UUID.fromString((String) data(response).get("attemptId"));
  }

  private ResponseEntity<Map> submitProgress(
      UUID attemptId, User user, long sequence, String characters) {
    return restTemplate.exchange(
        "/api/solo-attempts/" + attemptId + "/progress",
        HttpMethod.POST,
        new HttpEntity<>(
            "{\"sequence\":" + sequence + ",\"characters\":\"" + characters + "\"}",
            headersFor(user)),
        Map.class);
  }

  @Test
  void spoofedUserIdHeaderIsIgnoredInFavorOfJwtClaim() throws Exception {
    User authenticatedUser = newUser("eve");
    User spoofedUser = newUser("victim");
    CodeSnippet snippet = newSnippet("hi");

    ResponseEntity<Map> response =
        restTemplate.exchange(
            "/api/solo-attempts",
            HttpMethod.POST,
            new HttpEntity<>(
                "{\"codeSnippetId\":\"" + snippet.getId() + "\"}",
                headersFor(authenticatedUser, spoofedUser)),
            Map.class);
    UUID attemptId = UUID.fromString((String) data(response).get("attemptId"));

    SoloAttempt attempt = soloAttemptRepository.findById(attemptId).orElseThrow();
    assertThat(attempt.getUser().getId()).isEqualTo(authenticatedUser.getId());
    assertThat(attempt.getUser().getId()).isNotEqualTo(spoofedUser.getId());
    assertThat(soloAttemptRepository.findByUserId(spoofedUser.getId())).isEmpty();
  }

  @Test
  void startRejectsAttemptAgainstRetiredSnippet() throws Exception {
    User user = newUser("frank");
    CodeSnippet snippet = newDeletedSnippet("hi");

    ResponseEntity<Map> response =
        restTemplate.exchange(
            "/api/solo-attempts",
            HttpMethod.POST,
            new HttpEntity<>("{\"codeSnippetId\":\"" + snippet.getId() + "\"}", headersFor(user)),
            Map.class);

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
  }

  @Test
  void fullFlowStartsCountsDownAndCompletes() throws Exception {
    User user = newUser("alice");
    CodeSnippet snippet = newSnippet("hi");
    UUID attemptId = startAttempt(user, snippet);

    clock.advanceBy(Duration.ofSeconds(4));

    ResponseEntity<Map> response = submitProgress(attemptId, user, 1, "hi");

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    Map<String, Object> body = data(response);
    assertThat(body.get("state")).isEqualTo("COMPLETED");
    assertThat((Integer) body.get("cpm")).isGreaterThan(0);
  }

  @Test
  void duplicateCompletionReturnsIdempotentResult() throws Exception {
    User user = newUser("bob");
    CodeSnippet snippet = newSnippet("hi");
    UUID attemptId = startAttempt(user, snippet);
    clock.advanceBy(Duration.ofSeconds(4));

    ResponseEntity<Map> first = submitProgress(attemptId, user, 1, "hi");
    ResponseEntity<Map> retry = submitProgress(attemptId, user, 1, "hi");

    assertThat(retry.getStatusCode()).isEqualTo(HttpStatus.OK);
    assertThat(data(retry).get("cpm")).isEqualTo(data(first).get("cpm"));
  }

  @Test
  void invalidProgressAfterActivationLeavesAttemptActiveWithNoPartialData() throws Exception {
    User user = newUser("carol");
    CodeSnippet snippet = newSnippet("hello world");
    UUID attemptId = startAttempt(user, snippet);
    clock.advanceBy(Duration.ofSeconds(4));

    ResponseEntity<Map> setup = submitProgress(attemptId, user, 1, "hello ");
    assertThat(setup.getStatusCode()).isEqualTo(HttpStatus.OK);

    clock.advanceBy(Duration.ofSeconds(1));
    ResponseEntity<Map> mismatch = submitProgress(attemptId, user, 2, "xyz");
    assertThat(mismatch.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);

    SoloAttempt attempt = soloAttemptRepository.findById(attemptId).orElseThrow();
    assertThat(attempt.getState().name()).isEqualTo("ACTIVE");
    assertThat(attempt.getCpm()).isNull();
    assertThat(attempt.getDurationMs()).isNull();
    assertThat(attempt.getFinishedAt()).isNull();
  }

  @Test
  void concurrentCompletionOnlyCompletesOnce() throws Exception {
    User user = newUser("dave");
    CodeSnippet snippet = newSnippet("hello world");
    UUID attemptId = startAttempt(user, snippet);
    clock.advanceBy(Duration.ofSeconds(4));

    ResponseEntity<Map> setup = submitProgress(attemptId, user, 1, "hello ");
    assertThat(setup.getStatusCode()).isEqualTo(HttpStatus.OK);

    clock.advanceBy(Duration.ofSeconds(1));

    ExecutorService executor = Executors.newFixedThreadPool(2);
    try {
      CompletableFuture<ResponseEntity<Map>> first =
          CompletableFuture.supplyAsync(
              () -> submitProgress(attemptId, user, 2, "world"), executor);
      CompletableFuture<ResponseEntity<Map>> second =
          CompletableFuture.supplyAsync(
              () -> submitProgress(attemptId, user, 2, "world"), executor);
      CompletableFuture.allOf(first, second).join();

      ResponseEntity<Map> firstResponse = first.get();
      ResponseEntity<Map> secondResponse = second.get();
      assertThat(firstResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
      assertThat(secondResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
      assertThat(data(firstResponse).get("cpm")).isEqualTo(data(secondResponse).get("cpm"));

      SoloAttempt attempt = soloAttemptRepository.findById(attemptId).orElseThrow();
      assertThat(attempt.getState().name()).isEqualTo("COMPLETED");
    } finally {
      executor.shutdown();
    }
  }
}
