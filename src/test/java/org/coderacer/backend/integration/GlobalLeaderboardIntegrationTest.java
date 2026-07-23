package org.coderacer.backend.integration;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.List;
import org.coderacer.backend.dto.GlobalLeaderboardEntry;
import org.coderacer.backend.dto.GlobalLeaderboardResponse;
import org.coderacer.backend.enums.Category;
import org.coderacer.backend.enums.Difficulty;
import org.coderacer.backend.enums.UserRole;
import org.coderacer.backend.model.CodeSnippet;
import org.coderacer.backend.model.SoloAttempt;
import org.coderacer.backend.model.User;
import org.coderacer.backend.repository.CodeSnippetRepository;
import org.coderacer.backend.repository.SoloAttemptRepository;
import org.coderacer.backend.repository.UserRepository;
import org.coderacer.backend.service.GlobalLeaderboardService;
import org.coderacer.backend.support.AbstractPostgresIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;

@Transactional
class GlobalLeaderboardIntegrationTest extends AbstractPostgresIntegrationTest {

  @Autowired private GlobalLeaderboardService leaderboardService;
  @Autowired private SoloAttemptRepository attemptRepository;
  @Autowired private CodeSnippetRepository codeSnippetRepository;
  @Autowired private UserRepository userRepository;

  private final Instant now = Instant.parse("2026-01-01T00:00:00Z");

  @Test
  void ordersEntriesFastestFirst() {
    User alice = newUser("alice");
    User bob = newUser("bob");
    completed(alice, Difficulty.EASY, 20_000L, 400, now);
    completed(bob, Difficulty.EASY, 10_000L, 600, now);

    List<GlobalLeaderboardEntry> entries = leaderboard(Difficulty.EASY, 20).entries();

    assertThat(entries).hasSize(2);
    assertThat(entries.get(0).username()).isEqualTo(bob.getUsername());
    assertThat(entries.get(0).rank()).isEqualTo(1);
    assertThat(entries.get(0).durationMs()).isEqualTo(10_000L);
    assertThat(entries.get(0).cpm()).isEqualTo(600);
    assertThat(entries.get(1).username()).isEqualTo(alice.getUsername());
    assertThat(entries.get(1).rank()).isEqualTo(2);
  }

  @Test
  void tiedTimesShareARank() {
    User alice = newUser("alice");
    User bob = newUser("bob");
    User carol = newUser("carol");
    completed(alice, Difficulty.EASY, 20_000L, 400, now);
    completed(bob, Difficulty.EASY, 20_000L, 400, now);
    completed(carol, Difficulty.EASY, 30_000L, 200, now);

    List<GlobalLeaderboardEntry> entries = leaderboard(Difficulty.EASY, 20).entries();

    assertThat(entries).extracting(GlobalLeaderboardEntry::rank).containsExactly(1, 1, 3);
    assertThat(entries)
        .extracting(GlobalLeaderboardEntry::username)
        .containsExactly(alice.getUsername(), bob.getUsername(), carol.getUsername());
  }

  @Test
  void onlyOneRowPerUserKeyedOnTheirPersonalBest() {
    User alice = newUser("alice");
    completed(alice, Difficulty.EASY, 25_000L, 300, now);
    completed(alice, Difficulty.EASY, 15_000L, 500, now.plusSeconds(60));

    List<GlobalLeaderboardEntry> entries = leaderboard(Difficulty.EASY, 20).entries();

    assertThat(entries).hasSize(1);
    assertThat(entries.get(0).durationMs()).isEqualTo(15_000L);
    assertThat(entries.get(0).cpm()).isEqualTo(500);
  }

  @Test
  void excludesDeletedUsersAttempts() {
    User alice = newUser("alice");
    User deletedUser = newUser("carol");
    completed(deletedUser, Difficulty.EASY, 5_000L, 900, now);
    completed(alice, Difficulty.EASY, 20_000L, 200, now);
    deletedUser.setDeleted(true);
    userRepository.save(deletedUser);

    List<GlobalLeaderboardEntry> entries = leaderboard(Difficulty.EASY, 20).entries();

    assertThat(entries).hasSize(1);
    assertThat(entries.get(0).username()).isEqualTo(alice.getUsername());
  }

  @Test
  void excludesAbandonedAndIncompleteAttempts() {
    User alice = newUser("alice");
    completed(alice, Difficulty.EASY, 20_000L, 200, now);
    abandoned(alice, Difficulty.EASY);
    inProgress(alice, Difficulty.EASY);

    List<GlobalLeaderboardEntry> entries = leaderboard(Difficulty.EASY, 20).entries();

    assertThat(entries).hasSize(1);
    assertThat(entries.get(0).durationMs()).isEqualTo(20_000L);
  }

  @Test
  void excludesOtherDifficulties() {
    User alice = newUser("alice");
    completed(alice, Difficulty.EASY, 20_000L, 200, now);
    completed(alice, Difficulty.MEDIUM, 50_000L, 150, now);

    GlobalLeaderboardResponse hard = leaderboard(Difficulty.HARD, 20);

    assertThat(hard.entries()).isEmpty();
  }

  @Test
  void emptyDifficultyReturnsEmptyEntries() {
    GlobalLeaderboardResponse response = leaderboard(Difficulty.EASY, 20);

    assertThat(response.difficulty()).isEqualTo(Difficulty.EASY);
    assertThat(response.entries()).isEmpty();
  }

  @Test
  void limitTruncatesTheResultSet() {
    User alice = newUser("alice");
    User bob = newUser("bob");
    User carol = newUser("carol");
    completed(alice, Difficulty.EASY, 10_000L, 600, now);
    completed(bob, Difficulty.EASY, 20_000L, 400, now);
    completed(carol, Difficulty.EASY, 30_000L, 200, now);

    List<GlobalLeaderboardEntry> entries = leaderboard(Difficulty.EASY, 2).entries();

    assertThat(entries).hasSize(2);
    assertThat(entries)
        .extracting(GlobalLeaderboardEntry::username)
        .containsExactly(alice.getUsername(), bob.getUsername());
  }

  private GlobalLeaderboardResponse leaderboard(Difficulty difficulty, int limit) {
    return leaderboardService.forDifficulty(difficulty, limit);
  }

  private void completed(
      User user, Difficulty difficulty, long durationMs, int cpm, Instant finishedAt) {
    SoloAttempt attempt = new SoloAttempt(user, newSnippet(difficulty), difficulty, now);
    attempt.activate();
    attempt.complete(finishedAt, durationMs, cpm);
    attemptRepository.save(attempt);
  }

  private void abandoned(User user, Difficulty difficulty) {
    SoloAttempt attempt = new SoloAttempt(user, newSnippet(difficulty), difficulty, now);
    attempt.abandon();
    attemptRepository.save(attempt);
  }

  private void inProgress(User user, Difficulty difficulty) {
    SoloAttempt attempt = new SoloAttempt(user, newSnippet(difficulty), difficulty, now);
    attempt.activate();
    attemptRepository.save(attempt);
  }

  private CodeSnippet newSnippet(Difficulty difficulty) {
    Category category = Category.JAVA;
    String source = java.util.UUID.randomUUID().toString();
    return codeSnippetRepository.save(
        new CodeSnippet(source, source, sha256Hex(source), difficulty, category));
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
    user.setEmail(username + java.util.UUID.randomUUID() + "@example.com");
    user.setUsername(username + java.util.UUID.randomUUID().toString().substring(0, 8));
    user.setPasswordHash("hashed-password");
    user.setRole(UserRole.USER);
    user.setEmailVerified(true);
    user.setDeleted(false);
    return userRepository.save(user);
  }
}
