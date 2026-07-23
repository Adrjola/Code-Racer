package org.coderacer.backend.integration;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import org.coderacer.backend.dto.DifficultyStatistics;
import org.coderacer.backend.enums.Category;
import org.coderacer.backend.enums.Difficulty;
import org.coderacer.backend.enums.UserRole;
import org.coderacer.backend.model.CodeSnippet;
import org.coderacer.backend.model.SoloAttempt;
import org.coderacer.backend.model.User;
import org.coderacer.backend.repository.CodeSnippetRepository;
import org.coderacer.backend.repository.SoloAttemptRepository;
import org.coderacer.backend.repository.UserRepository;
import org.coderacer.backend.service.PersonalStatisticsService;
import org.coderacer.backend.support.AbstractPostgresIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;

@Transactional
class PersonalStatisticsIntegrationTest extends AbstractPostgresIntegrationTest {

  @Autowired private PersonalStatisticsService statisticsService;
  @Autowired private SoloAttemptRepository attemptRepository;
  @Autowired private CodeSnippetRepository codeSnippetRepository;
  @Autowired private UserRepository userRepository;

  private final Instant now = Instant.parse("2026-01-01T00:00:00Z");

  @Test
  void returnsFourMetricsPerDifficultyFromCompletedAttempts() {
    User alice = newUser("alice");
    completed(alice, Difficulty.EASY, 20_000L, 200);
    completed(alice, Difficulty.EASY, 40_000L, 300);
    completed(alice, Difficulty.MEDIUM, 50_000L, 150);

    Map<Difficulty, DifficultyStatistics> stats = statsByDifficulty(alice.getId());

    assertThat(stats).containsOnlyKeys(Difficulty.EASY, Difficulty.MEDIUM, Difficulty.HARD);

    DifficultyStatistics easy = stats.get(Difficulty.EASY);
    assertThat(easy.fastestDurationMs()).isEqualTo(20_000L);
    assertThat(easy.highestCpm()).isEqualTo(300);
    assertThat(easy.averageDurationMs()).isEqualTo(30_000L);
    assertThat(easy.averageCpm()).isEqualTo(250);

    DifficultyStatistics medium = stats.get(Difficulty.MEDIUM);
    assertThat(medium.fastestDurationMs()).isEqualTo(50_000L);
    assertThat(medium.averageCpm()).isEqualTo(150);
  }

  @Test
  void reportsNullMetricsForDifficultiesWithNoCompletedAttempts() {
    User alice = newUser("alice");
    completed(alice, Difficulty.EASY, 20_000L, 200);

    DifficultyStatistics hard = statsByDifficulty(alice.getId()).get(Difficulty.HARD);

    assertThat(hard.difficulty()).isEqualTo(Difficulty.HARD);
    assertThat(hard.fastestDurationMs()).isNull();
    assertThat(hard.highestCpm()).isNull();
    assertThat(hard.averageDurationMs()).isNull();
    assertThat(hard.averageCpm()).isNull();
  }

  @Test
  void emptyDataReturnsEveryDifficultyWithNullMetrics() {
    User alice = newUser("alice");

    Map<Difficulty, DifficultyStatistics> stats = statsByDifficulty(alice.getId());

    assertThat(stats).containsOnlyKeys(Difficulty.EASY, Difficulty.MEDIUM, Difficulty.HARD);
    assertThat(stats.values()).allSatisfy(entry -> assertThat(entry.averageCpm()).isNull());
  }

  @Test
  void excludesAbandonedAttemptsFromEveryMetric() {
    User alice = newUser("alice");
    completed(alice, Difficulty.EASY, 20_000L, 200);
    abandoned(alice, Difficulty.EASY);

    DifficultyStatistics easy = statsByDifficulty(alice.getId()).get(Difficulty.EASY);

    // The abandoned attempt carries no duration/cpm and must not shift the average.
    assertThat(easy.averageDurationMs()).isEqualTo(20_000L);
    assertThat(easy.averageCpm()).isEqualTo(200);
  }

  @Test
  void excludesOtherUsersAttempts() {
    User alice = newUser("alice");
    User bob = newUser("bob");
    completed(alice, Difficulty.EASY, 20_000L, 200);
    completed(bob, Difficulty.EASY, 90_000L, 999);

    DifficultyStatistics easy = statsByDifficulty(alice.getId()).get(Difficulty.EASY);

    assertThat(easy.highestCpm()).isEqualTo(200);
    assertThat(easy.fastestDurationMs()).isEqualTo(20_000L);
  }

  @Test
  void roundsAveragesHalfUp() {
    User alice = newUser("alice");
    completed(alice, Difficulty.EASY, 30_000L, 240);
    completed(alice, Difficulty.EASY, 30_001L, 241);

    DifficultyStatistics easy = statsByDifficulty(alice.getId()).get(Difficulty.EASY);

    // 30000.5 -> 30001, 240.5 -> 241
    assertThat(easy.averageDurationMs()).isEqualTo(30_001L);
    assertThat(easy.averageCpm()).isEqualTo(241);
  }

  private Map<Difficulty, DifficultyStatistics> statsByDifficulty(UUID userId) {
    return statisticsService.forUser(userId).difficulties().stream()
        .collect(
            java.util.stream.Collectors.toMap(
                DifficultyStatistics::difficulty, Function.identity()));
  }

  private void completed(User user, Difficulty difficulty, long durationMs, int cpm) {
    SoloAttempt attempt = new SoloAttempt(user, newSnippet(difficulty), difficulty, now);
    attempt.activate();
    attempt.complete(now.plusMillis(durationMs), durationMs, cpm);
    attemptRepository.save(attempt);
  }

  private void abandoned(User user, Difficulty difficulty) {
    SoloAttempt attempt = new SoloAttempt(user, newSnippet(difficulty), difficulty, now);
    attempt.abandon();
    attemptRepository.save(attempt);
  }

  private CodeSnippet newSnippet(Difficulty difficulty) {
    Category category = Category.JAVA;
    String source = UUID.randomUUID().toString();
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
    user.setEmail(username + UUID.randomUUID() + "@example.com");
    user.setUsername(username + UUID.randomUUID().toString().substring(0, 8));
    user.setPasswordHash("hashed-password");
    user.setRole(UserRole.USER);
    user.setEmailVerified(true);
    user.setDeleted(false);
    return userRepository.save(user);
  }
}
