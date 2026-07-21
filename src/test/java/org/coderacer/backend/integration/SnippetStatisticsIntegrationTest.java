package org.coderacer.backend.integration;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.coderacer.backend.dto.SnippetStatistics;
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
import org.coderacer.backend.service.SnippetStatisticsService;
import org.coderacer.backend.support.IntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;

@Transactional
@IntegrationTest
class SnippetStatisticsIntegrationTest {

  @Autowired private SnippetStatisticsService statisticsService;
  @Autowired private SoloAttemptRepository attemptRepository;
  @Autowired private CodeSnippetRepository codeSnippetRepository;
  @Autowired private CategoryRepository categoryRepository;
  @Autowired private UserRepository userRepository;

  private final Instant now = Instant.parse("2026-01-01T00:00:00Z");

  @Test
  void returnsOneEntryPerSnippetUsingItsFastestCompletedAttempt() {
    User alice = newUser("alice");
    CodeSnippet twoSum = newSnippet("Two Sum", "JAVA", Difficulty.EASY);
    completed(alice, twoSum, 45_000L, 400, now);
    completed(alice, twoSum, 41_000L, 452, now.plusSeconds(60));

    List<SnippetStatistics> stats = statisticsService.forUser(alice.getId());

    assertThat(stats).hasSize(1);
    assertThat(stats.getFirst().snippetTitle()).isEqualTo("Two Sum");
    assertThat(stats.getFirst().categoryName()).startsWith("JAVA");
    assertThat(stats.getFirst().bestDurationMs()).isEqualTo(41_000L);
    assertThat(stats.getFirst().bestCpm()).isEqualTo(452);
  }

  @Test
  void ordersSnippetsByMostRecentlySetBestFirst() {
    User alice = newUser("alice");
    CodeSnippet twoSum = newSnippet("Two Sum", "JAVA", Difficulty.EASY);
    CodeSnippet groupByCount = newSnippet("Group By Count", "SQL", Difficulty.MEDIUM);
    completed(alice, twoSum, 41_000L, 452, now);
    completed(alice, groupByCount, 50_000L, 300, now.plusSeconds(7_200));

    List<SnippetStatistics> stats = statisticsService.forUser(alice.getId());

    assertThat(stats)
        .extracting(SnippetStatistics::snippetTitle)
        .containsExactly("Group By Count", "Two Sum");
  }

  @Test
  void returnsEmptyListWhenUserHasNoCompletedAttempts() {
    User alice = newUser("alice");

    assertThat(statisticsService.forUser(alice.getId())).isEmpty();
  }

  @Test
  void excludesAttemptsOnSoftDeletedSnippets() {
    User alice = newUser("alice");
    CodeSnippet deleted = newSnippet("Retired Snippet", "JAVA", Difficulty.EASY);
    completed(alice, deleted, 41_000L, 452, now);
    deleted.softDelete();
    codeSnippetRepository.save(deleted);

    assertThat(statisticsService.forUser(alice.getId())).isEmpty();
  }

  @Test
  void excludesAbandonedAttempts() {
    User alice = newUser("alice");
    CodeSnippet snippet = newSnippet("Two Sum", "JAVA", Difficulty.EASY);
    SoloAttempt abandoned = new SoloAttempt(alice, snippet, Difficulty.EASY, now);
    abandoned.abandon();
    attemptRepository.save(abandoned);

    assertThat(statisticsService.forUser(alice.getId())).isEmpty();
  }

  @Test
  void excludesOtherUsersAttempts() {
    User alice = newUser("alice");
    User bob = newUser("bob");
    CodeSnippet snippet = newSnippet("Two Sum", "JAVA", Difficulty.EASY);
    completed(bob, snippet, 20_000L, 999, now);

    assertThat(statisticsService.forUser(alice.getId())).isEmpty();
  }

  private void completed(
      User user, CodeSnippet snippet, long durationMs, int cpm, Instant finishedAt) {
    SoloAttempt attempt = new SoloAttempt(user, snippet, snippet.getDifficulty(), now);
    attempt.activate();
    attempt.complete(finishedAt, durationMs, cpm);
    attemptRepository.save(attempt);
  }

  private CodeSnippet newSnippet(String title, String categoryName, Difficulty difficulty) {
    Category category = new Category();
    category.setName(categoryName + " " + UUID.randomUUID());
    category.setActive(true);
    category = categoryRepository.save(category);
    String source = UUID.randomUUID().toString();
    return codeSnippetRepository.save(
        new CodeSnippet(title, source, sha256Hex(source), difficulty, category));
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
