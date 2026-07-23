package org.coderacer.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.coderacer.backend.dto.SoloAttemptRankingResponse;
import org.coderacer.backend.enums.Category;
import org.coderacer.backend.enums.Difficulty;
import org.coderacer.backend.enums.SoloAttemptState;
import org.coderacer.backend.exception.ConflictException;
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
class SoloAttemptRankingServiceTest {

  @Mock private SoloAttemptRepository repository;
  @Mock private SoloAttemptService soloAttemptService;

  private SoloAttemptRankingService service;

  private final UUID attemptId = UUID.randomUUID();
  private final UUID userId = UUID.randomUUID();
  private final UUID snippetId = UUID.randomUUID();
  private final Instant now = Instant.parse("2026-01-01T00:00:00Z");
  private final CodeSnippet snippet = snippet();
  private final List<SoloAttempt> board = new ArrayList<>();

  @BeforeEach
  void setUp() {
    service = new SoloAttemptRankingService(repository, soloAttemptService);
  }

  @Test
  void firstCompletionReportsNoPreviousFiguresAndRanksTheRunItself() {
    rivalsFasterThan(170);
    SoloAttempt run = ownRun(attemptId, 41_111L, 452);
    givenBoard(run);

    SoloAttemptRankingResponse response = service.forAttempt(attemptId, userId);

    assertThat(response.newPersonalBest()).isTrue();
    assertThat(response.previousBestDurationMs()).isNull();
    assertThat(response.previousBestCpm()).isNull();
    assertThat(response.previousGlobalRank()).isNull();
    assertThat(response.attemptRank()).isEqualTo(171);
    assertThat(response.globalRank()).isEqualTo(171);
  }

  @Test
  void fasterRunIsAPersonalBestAndReportsTheRankItReplaces() {
    // 170 rivals beat the new time, 130 more sit between it and the old one.
    rivalsFasterThan(170, 41_000L);
    rivalsFasterThan(130, 45_000L);
    ownRun(UUID.randomUUID(), 47_000L, 431);
    SoloAttempt run = ownRun(attemptId, 41_222L, 452);
    givenBoard(run);

    SoloAttemptRankingResponse response = service.forAttempt(attemptId, userId);

    assertThat(response.newPersonalBest()).isTrue();
    assertThat(response.previousBestDurationMs()).isEqualTo(47_000L);
    assertThat(response.previousBestCpm()).isEqualTo(431);
    assertThat(response.attemptRank()).isEqualTo(171);
    assertThat(response.globalRank()).isEqualTo(171);
    assertThat(response.previousGlobalRank()).isEqualTo(301);
  }

  @Test
  void slowerRunLeavesTheHeldRankIntactAndStillRanksTheRun() {
    rivalsFasterThan(170, 40_000L);
    rivalsFasterThan(130, 45_000L);
    ownRun(UUID.randomUUID(), 41_000L, 452);
    SoloAttempt run = ownRun(attemptId, 48_111L, 402);
    givenBoard(run);

    SoloAttemptRankingResponse response = service.forAttempt(attemptId, userId);

    assertThat(response.newPersonalBest()).isFalse();
    // The run itself would have placed 301st, but the player keeps the 171st
    // spot their earlier best already earned.
    assertThat(response.attemptRank()).isEqualTo(301);
    assertThat(response.globalRank()).isEqualTo(171);
    assertThat(response.previousGlobalRank()).isEqualTo(171);
  }

  @Test
  void repeatedRunsByTheSameRivalOnlyCostOnePlace() {
    UUID rivalId = UUID.randomUUID();
    rivalRun(rivalId, 10_000L);
    rivalRun(rivalId, 11_000L);
    rivalRun(rivalId, 12_000L);
    SoloAttempt run = ownRun(attemptId, 30_000L, 300);
    givenBoard(run);

    SoloAttemptRankingResponse response = service.forAttempt(attemptId, userId);

    assertThat(response.globalRank()).isEqualTo(2);
  }

  @Test
  void matchingThePreviousBestExactlyIsNotAPersonalBest() {
    rivalsFasterThan(170);
    ownRun(UUID.randomUUID(), 41_000L, 452);
    SoloAttempt run = ownRun(attemptId, 41_000L, 500);
    givenBoard(run);

    SoloAttemptRankingResponse response = service.forAttempt(attemptId, userId);

    assertThat(response.newPersonalBest()).isFalse();
    assertThat(response.globalRank()).isEqualTo(171);
  }

  @Test
  void aHigherCpmAloneDoesNotMakeItAPersonalBest() {
    ownRun(UUID.randomUUID(), 41_000L, 452);
    SoloAttempt run = ownRun(attemptId, 48_000L, 999);
    givenBoard(run);

    SoloAttemptRankingResponse response = service.forAttempt(attemptId, userId);

    assertThat(response.newPersonalBest()).isFalse();
    assertThat(response.previousBestCpm()).isEqualTo(452);
  }

  @Test
  void unfinishedAttemptsHaveNoRanking() {
    SoloAttempt attempt = attempt(attemptId, userId);
    when(soloAttemptService.getById(attemptId, userId)).thenReturn(attempt);

    assertThatThrownBy(() -> service.forAttempt(attemptId, userId))
        .isInstanceOf(ConflictException.class)
        .hasMessageContaining("not completed");
  }

  private void givenBoard(SoloAttempt rankedRun) {
    when(soloAttemptService.getById(attemptId, userId)).thenReturn(rankedRun);
    when(repository.findByCodeSnippetIdAndStateAndUserDeletedFalse(
            snippetId, SoloAttemptState.COMPLETED))
        .thenReturn(board);
  }

  /** Adds one completed run for the caller and puts it on the board. */
  private SoloAttempt ownRun(UUID id, long durationMs, int cpm) {
    return completed(id, userId, durationMs, cpm);
  }

  private void rivalRun(UUID rivalId, long durationMs) {
    completed(UUID.randomUUID(), rivalId, durationMs, 300);
  }

  /** Distinct rivals, all comfortably faster than the given time. */
  private void rivalsFasterThan(int count) {
    rivalsFasterThan(count, 1_000L);
  }

  private void rivalsFasterThan(int count, long durationMs) {
    for (int i = 0; i < count; i++) {
      rivalRun(UUID.randomUUID(), durationMs);
    }
  }

  private SoloAttempt completed(UUID id, UUID ownerId, long durationMs, int cpm) {
    SoloAttempt attempt = attempt(id, ownerId);
    attempt.activate();
    attempt.complete(now.plusMillis(durationMs), durationMs, cpm);
    board.add(attempt);
    return attempt;
  }

  private SoloAttempt attempt(UUID id, UUID ownerId) {
    User user = new User();
    ReflectionTestUtils.setField(user, "id", ownerId);

    SoloAttempt attempt = new SoloAttempt(user, snippet, Difficulty.EASY, now);
    ReflectionTestUtils.setField(attempt, "id", id);
    return attempt;
  }

  private CodeSnippet snippet() {
    CodeSnippet created = new CodeSnippet("hello", "hello", "hash", Difficulty.EASY, Category.JAVA);
    ReflectionTestUtils.setField(created, "id", snippetId);
    return created;
  }
}
