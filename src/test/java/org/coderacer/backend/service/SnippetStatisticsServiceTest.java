package org.coderacer.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.coderacer.backend.dto.SnippetStatistics;
import org.coderacer.backend.enums.Category;
import org.coderacer.backend.enums.Difficulty;
import org.coderacer.backend.enums.SnippetLifecycle;
import org.coderacer.backend.enums.SoloAttemptState;
import org.coderacer.backend.model.CodeSnippet;
import org.coderacer.backend.model.SoloAttempt;
import org.coderacer.backend.model.User;
import org.coderacer.backend.repository.SoloAttemptRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class SnippetStatisticsServiceTest {

  @Mock private SoloAttemptRepository repository;

  private SnippetStatisticsService service;

  private final UUID userId = UUID.randomUUID();
  private final Instant now = Instant.parse("2026-01-01T00:00:00Z");

  @BeforeEach
  void setUp() {
    service = new SnippetStatisticsService(repository);
  }

  @Test
  void returnsEmptyListWhenUserHasNoCompletedAttempts() {
    when(repository.findByUserIdAndStateAndCodeSnippetLifecycleNot(any(), any(), any()))
        .thenReturn(List.of());

    assertThat(service.forUser(userId)).isEmpty();
  }

  @Test
  void queriesCompletedAttemptsExcludingDeletedSnippets() {
    when(repository.findByUserIdAndStateAndCodeSnippetLifecycleNot(any(), any(), any()))
        .thenReturn(List.of());

    service.forUser(userId);

    verify(repository)
        .findByUserIdAndStateAndCodeSnippetLifecycleNot(
            userId, SoloAttemptState.COMPLETED, SnippetLifecycle.DELETED);
  }

  @Test
  void keepsTheFastestAttemptWhenTheSameSnippetWasRacedMultipleTimes() {
    CodeSnippet snippet = snippet("Two Sum", Category.JAVA, Difficulty.EASY);
    SoloAttempt slower = attempt(snippet, 45_000L, 400, now);
    SoloAttempt faster = attempt(snippet, 41_000L, 452, now.plusSeconds(60));
    when(repository.findByUserIdAndStateAndCodeSnippetLifecycleNot(any(), any(), any()))
        .thenReturn(List.of(slower, faster));

    List<SnippetStatistics> stats = service.forUser(userId);

    assertThat(stats).hasSize(1);
    assertThat(stats.getFirst().bestDurationMs()).isEqualTo(41_000L);
    assertThat(stats.getFirst().bestCpm()).isEqualTo(452);
  }

  @Test
  void breaksDurationTiesByTheEarlierFinish() {
    CodeSnippet snippet = snippet("Two Sum", Category.JAVA, Difficulty.EASY);
    SoloAttempt earlier = attempt(snippet, 41_000L, 452, now);
    SoloAttempt later = attempt(snippet, 41_000L, 452, now.plusSeconds(60));
    when(repository.findByUserIdAndStateAndCodeSnippetLifecycleNot(any(), any(), any()))
        .thenReturn(List.of(later, earlier));

    List<SnippetStatistics> stats = service.forUser(userId);

    assertThat(stats).hasSize(1);
    assertThat(stats.getFirst().bestFinishedAt()).isEqualTo(now);
  }

  @Test
  void includesOneEntryPerSnippetSortedByMostRecentBestFirst() {
    CodeSnippet twoSum = snippet("Two Sum", Category.JAVA, Difficulty.EASY);
    CodeSnippet groupByCount = snippet("Group By Count", Category.SQL, Difficulty.MEDIUM);
    SoloAttempt olderBest = attempt(twoSum, 41_000L, 452, now);
    SoloAttempt recentBest = attempt(groupByCount, 50_000L, 300, now.plusSeconds(7200));
    when(repository.findByUserIdAndStateAndCodeSnippetLifecycleNot(any(), any(), any()))
        .thenReturn(List.of(olderBest, recentBest));

    List<SnippetStatistics> stats = service.forUser(userId);

    assertThat(stats)
        .extracting(SnippetStatistics::snippetTitle)
        .containsExactly("Group By Count", "Two Sum");
  }

  @Test
  void mapsSnippetAndCategoryDetailsOntoEachEntry() {
    CodeSnippet snippet = snippet("Two Sum", Category.JAVA, Difficulty.HARD);
    SoloAttempt run = attempt(snippet, 41_000L, 452, now);
    when(repository.findByUserIdAndStateAndCodeSnippetLifecycleNot(any(), any(), any()))
        .thenReturn(List.of(run));

    SnippetStatistics stats = service.forUser(userId).getFirst();

    assertThat(stats.snippetId()).isEqualTo(snippet.getId());
    assertThat(stats.snippetTitle()).isEqualTo("Two Sum");
    assertThat(stats.categoryName()).isEqualTo(Category.JAVA.getDisplayName());
    assertThat(stats.difficulty()).isEqualTo(Difficulty.HARD);
  }

  private CodeSnippet snippet(String title, Category category, Difficulty difficulty) {
    CodeSnippet snippet = new CodeSnippet(title, "source", "hash", difficulty, category);
    ReflectionTestUtils.setField(snippet, "id", UUID.randomUUID());
    return snippet;
  }

  private SoloAttempt attempt(CodeSnippet snippet, long durationMs, int cpm, Instant finishedAt) {
    User user = new User();
    ReflectionTestUtils.setField(user, "id", userId);
    SoloAttempt attempt = new SoloAttempt(user, snippet, snippet.getDifficulty(), now);
    attempt.activate();
    attempt.complete(finishedAt, durationMs, cpm);
    return attempt;
  }
}
