package org.coderacer.backend.integration;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.Map;
import java.util.function.Function;
import org.coderacer.backend.dto.DifficultyGlobalStatistics;
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
import org.coderacer.backend.service.GlobalStatisticsService;
import org.coderacer.backend.support.AbstractPostgresIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;

@Transactional
class GlobalStatisticsIntegrationTest extends AbstractPostgresIntegrationTest {

  @Autowired private GlobalStatisticsService globalStatisticsService;
  @Autowired private SoloAttemptRepository attemptRepository;
  @Autowired private CodeSnippetRepository codeSnippetRepository;
  @Autowired private CategoryRepository categoryRepository;
  @Autowired private UserRepository userRepository;

  private final Instant now = Instant.parse("2026-01-01T00:00:00Z");

  @Test
  void returnsFastestAndHighestCpmPerDifficulty() {
    User alice = newUser("alice");
    User bob = newUser("bob");
    completed(alice, Difficulty.EASY, 20_000L, 200, now);
    completed(bob, Difficulty.EASY, 30_000L, 500, now);

    DifficultyGlobalStatistics easy = statsByDifficulty().get(Difficulty.EASY);

    assertThat(easy.fastestTime().username()).isEqualTo(alice.getUsername());
    assertThat(easy.fastestTime().durationMs()).isEqualTo(20_000L);
    assertThat(easy.highestCpm().username()).isEqualTo(bob.getUsername());
    assertThat(easy.highestCpm().cpm()).isEqualTo(500);
  }

  @Test
  void tieBreaksFastestTimeByEarliestFinishedAtThenUserId() {
    User alice = newUser("alice");
    User bob = newUser("bob");
    completed(alice, Difficulty.EASY, 20_000L, 200, now);
    completed(bob, Difficulty.EASY, 20_000L, 200, now);

    DifficultyGlobalStatistics easy = statsByDifficulty().get(Difficulty.EASY);

    // Same durationMs, same finishedAt: the deterministic tiebreak is stable user id, and
    // alice's user id sorts first because she was created (and thus id-generated) first.
    assertThat(easy.fastestTime().username()).isEqualTo(alice.getUsername());
  }

  @Test
  void tieBreaksHighestCpmByEarliestFinishedAtThenUserId() {
    User alice = newUser("alice");
    User bob = newUser("bob");
    completed(alice, Difficulty.EASY, 20_000L, 400, now);
    completed(bob, Difficulty.EASY, 25_000L, 400, now);

    DifficultyGlobalStatistics easy = statsByDifficulty().get(Difficulty.EASY);

    assertThat(easy.highestCpm().username()).isEqualTo(alice.getUsername());
  }

  @Test
  void emptyDifficultyReturnsNullRecordsButDifficultyStillPresent() {
    User alice = newUser("alice");
    completed(alice, Difficulty.EASY, 20_000L, 200, now);

    Map<Difficulty, DifficultyGlobalStatistics> stats = statsByDifficulty();

    assertThat(stats).containsOnlyKeys(Difficulty.EASY, Difficulty.MEDIUM, Difficulty.HARD);
    DifficultyGlobalStatistics hard = stats.get(Difficulty.HARD);
    assertThat(hard.fastestTime()).isNull();
    assertThat(hard.highestCpm()).isNull();
  }

  @Test
  void excludesAbandonedAndIncompleteAttempts() {
    User alice = newUser("alice");
    completed(alice, Difficulty.EASY, 20_000L, 200, now);
    abandoned(alice, Difficulty.EASY);
    inProgress(alice, Difficulty.EASY);

    DifficultyGlobalStatistics easy = statsByDifficulty().get(Difficulty.EASY);

    assertThat(easy.fastestTime().durationMs()).isEqualTo(20_000L);
    assertThat(easy.highestCpm().cpm()).isEqualTo(200);
  }

  @Test
  void excludesInvalidatedAndExpiredAttempts() {
    User alice = newUser("alice");
    completed(alice, Difficulty.EASY, 20_000L, 200, now);
    invalidated(alice, Difficulty.EASY);
    expired(alice, Difficulty.EASY);

    DifficultyGlobalStatistics easy = statsByDifficulty().get(Difficulty.EASY);

    assertThat(easy.fastestTime().durationMs()).isEqualTo(20_000L);
    assertThat(easy.highestCpm().cpm()).isEqualTo(200);
  }

  @Test
  void excludesDeletedUsersAttempts() {
    User alice = newUser("alice");
    User deletedUser = newUser("carol");
    completed(deletedUser, Difficulty.EASY, 5_000L, 900, now);
    completed(alice, Difficulty.EASY, 20_000L, 200, now);
    deletedUser.setDeleted(true);
    userRepository.save(deletedUser);

    DifficultyGlobalStatistics easy = statsByDifficulty().get(Difficulty.EASY);

    assertThat(easy.fastestTime().username()).isEqualTo(alice.getUsername());
    assertThat(easy.highestCpm().username()).isEqualTo(alice.getUsername());
  }

  @Test
  void excludesDisabledUsersAttempts() {
    User alice = newUser("alice");
    User disabledUser = newUser("dave");
    completed(disabledUser, Difficulty.EASY, 5_000L, 900, now);
    completed(alice, Difficulty.EASY, 20_000L, 200, now);
    disabledUser.setEnabled(false);
    userRepository.save(disabledUser);

    DifficultyGlobalStatistics easy = statsByDifficulty().get(Difficulty.EASY);

    assertThat(easy.fastestTime().username()).isEqualTo(alice.getUsername());
    assertThat(easy.highestCpm().username()).isEqualTo(alice.getUsername());
  }

  @Test
  void excludesOtherDifficultiesFromEachBucket() {
    User alice = newUser("alice");
    completed(alice, Difficulty.EASY, 20_000L, 200, now);
    completed(alice, Difficulty.MEDIUM, 50_000L, 150, now);

    Map<Difficulty, DifficultyGlobalStatistics> stats = statsByDifficulty();

    assertThat(stats.get(Difficulty.EASY).fastestTime().durationMs()).isEqualTo(20_000L);
    assertThat(stats.get(Difficulty.MEDIUM).fastestTime().durationMs()).isEqualTo(50_000L);
    assertThat(stats.get(Difficulty.HARD).fastestTime()).isNull();
  }

  private Map<Difficulty, DifficultyGlobalStatistics> statsByDifficulty() {
    return globalStatisticsService.compute().difficulties().stream()
        .collect(
            java.util.stream.Collectors.toMap(
                DifficultyGlobalStatistics::difficulty, Function.identity()));
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

  private void invalidated(User user, Difficulty difficulty) {
    SoloAttempt attempt = new SoloAttempt(user, newSnippet(difficulty), difficulty, now);
    attempt.activate();
    attempt.invalidate();
    attemptRepository.save(attempt);
  }

  private void expired(User user, Difficulty difficulty) {
    SoloAttempt attempt = new SoloAttempt(user, newSnippet(difficulty), difficulty, now);
    attempt.activate();
    attempt.expire();
    attemptRepository.save(attempt);
  }

  private CodeSnippet newSnippet(Difficulty difficulty) {
    Category category = new Category();
    category.setName("Category " + java.util.UUID.randomUUID());
    category.setActive(true);
    category = categoryRepository.save(category);
    String source = java.util.UUID.randomUUID().toString();
    return codeSnippetRepository.save(
        CodeSnippet.firstRevision(source, source, sha256Hex(source), difficulty, category));
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
    user.setEnabled(true);
    user.setDeleted(false);
    return userRepository.save(user);
  }
}
