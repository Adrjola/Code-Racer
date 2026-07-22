package org.coderacer.backend.integration;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.UUID;
import org.coderacer.backend.dto.WorldBestResponse;
import org.coderacer.backend.enums.Category;
import org.coderacer.backend.enums.Difficulty;
import org.coderacer.backend.enums.UserRole;
import org.coderacer.backend.model.CodeSnippet;
import org.coderacer.backend.model.SoloAttempt;
import org.coderacer.backend.model.User;
import org.coderacer.backend.repository.CodeSnippetRepository;
import org.coderacer.backend.repository.SoloAttemptRepository;
import org.coderacer.backend.repository.UserRepository;
import org.coderacer.backend.service.WorldBestService;
import org.coderacer.backend.support.AbstractPostgresIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;

@Transactional
class WorldBestIntegrationTest extends AbstractPostgresIntegrationTest {

  @Autowired private WorldBestService worldBestService;
  @Autowired private SoloAttemptRepository attemptRepository;
  @Autowired private CodeSnippetRepository codeSnippetRepository;
  @Autowired private UserRepository userRepository;

  private final Instant now = Instant.parse("2026-01-01T00:00:00Z");

  @Test
  void returnsFastestAndHighestCpmForTheSnippet() {
    CodeSnippet snippet = newSnippet();
    User alice = newUser("alice");
    User bob = newUser("bob");
    completed(alice, snippet, 20_000L, 200);
    completed(bob, snippet, 30_000L, 500);

    WorldBestResponse result = worldBestService.forSnippet(snippet.getId());

    assertThat(result.timeHolderName()).isEqualTo(alice.getUsername());
    assertThat(result.durationMs()).isEqualTo(20_000L);
    assertThat(result.cpmHolderName()).isEqualTo(bob.getUsername());
    assertThat(result.cpm()).isEqualTo(500);
  }

  @Test
  void tieBreaksFastestTimeByEarliestFinishedAtThenUserId() {
    CodeSnippet snippet = newSnippet();
    User alice = newUser("alice");
    User bob = newUser("bob");
    completed(alice, snippet, 20_000L, 200);
    completed(bob, snippet, 20_000L, 200);

    WorldBestResponse result = worldBestService.forSnippet(snippet.getId());

    assertThat(result.timeHolderName()).isEqualTo(alice.getUsername());
  }

  @Test
  void tieBreaksHighestCpmByEarliestFinishedAtThenUserId() {
    CodeSnippet snippet = newSnippet();
    User alice = newUser("alice");
    User bob = newUser("bob");
    completed(alice, snippet, 20_000L, 400);
    completed(bob, snippet, 25_000L, 400);

    WorldBestResponse result = worldBestService.forSnippet(snippet.getId());

    assertThat(result.cpmHolderName()).isEqualTo(alice.getUsername());
  }

  @Test
  void snippetWithNoCompletedAttemptsReturnsAllNulls() {
    CodeSnippet snippet = newSnippet();

    WorldBestResponse result = worldBestService.forSnippet(snippet.getId());

    assertThat(result.durationMs()).isNull();
    assertThat(result.timeHolderName()).isNull();
    assertThat(result.cpm()).isNull();
    assertThat(result.cpmHolderName()).isNull();
  }

  @Test
  void anUnknownSnippetIdAlsoReturnsAllNulls() {
    WorldBestResponse result = worldBestService.forSnippet(UUID.randomUUID());

    assertThat(result.durationMs()).isNull();
    assertThat(result.cpm()).isNull();
  }

  @Test
  void excludesAbandonedAndIncompleteAttempts() {
    CodeSnippet snippet = newSnippet();
    User alice = newUser("alice");
    completed(alice, snippet, 20_000L, 200);
    abandoned(alice, snippet);

    WorldBestResponse result = worldBestService.forSnippet(snippet.getId());

    assertThat(result.durationMs()).isEqualTo(20_000L);
  }

  @Test
  void excludesDeletedUsersAttempts() {
    CodeSnippet snippet = newSnippet();
    User alice = newUser("alice");
    User deletedUser = newUser("carol");
    completed(deletedUser, snippet, 5_000L, 900);
    completed(alice, snippet, 20_000L, 200);
    deletedUser.setDeleted(true);
    userRepository.save(deletedUser);

    WorldBestResponse result = worldBestService.forSnippet(snippet.getId());

    assertThat(result.timeHolderName()).isEqualTo(alice.getUsername());
    assertThat(result.cpmHolderName()).isEqualTo(alice.getUsername());
  }

  @Test
  void otherSnippetsDoNotLeakIntoThisOnesWorldBest() {
    CodeSnippet snippet = newSnippet();
    CodeSnippet otherSnippet = newSnippet();
    User alice = newUser("alice");
    completed(alice, otherSnippet, 1_000L, 900);
    completed(alice, snippet, 20_000L, 200);

    WorldBestResponse result = worldBestService.forSnippet(snippet.getId());

    assertThat(result.durationMs()).isEqualTo(20_000L);
    assertThat(result.cpm()).isEqualTo(200);
  }

  private void completed(User user, CodeSnippet snippet, long durationMs, int cpm) {
    SoloAttempt attempt = new SoloAttempt(user, snippet, snippet.getDifficulty(), now);
    attempt.activate();
    attempt.complete(now.plusMillis(durationMs), durationMs, cpm);
    attemptRepository.save(attempt);
  }

  private void abandoned(User user, CodeSnippet snippet) {
    SoloAttempt attempt = new SoloAttempt(user, snippet, snippet.getDifficulty(), now);
    attempt.abandon();
    attemptRepository.save(attempt);
  }

  private CodeSnippet newSnippet() {
    String source = UUID.randomUUID().toString();
    return codeSnippetRepository.save(
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

  private User newUser(String username) {
    User user = new User();
    user.setEmail(username + UUID.randomUUID() + "@example.com");
    user.setUsername(username + UUID.randomUUID().toString().substring(0, 8));
    user.setPasswordHash("hashed-password");
    user.setRole(UserRole.USER);
    user.setEmailVerified(true);
    user.setDeleted(false);
    return userRepository.save(user);
  }
}
