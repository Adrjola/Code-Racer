package org.coderacer.backend.service;

import java.util.Collection;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.coderacer.backend.dto.SoloAttemptRankingResponse;
import org.coderacer.backend.enums.SoloAttemptState;
import org.coderacer.backend.exception.ConflictException;
import org.coderacer.backend.model.SoloAttempt;
import org.coderacer.backend.repository.SoloAttemptRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Ranks a finished attempt against the rest of the field on the same snippet. Positions come from
 * time only, and each player holds one row keyed on their fastest run.
 */
@Service
@RequiredArgsConstructor
public class SoloAttemptRankingService {

  private final SoloAttemptRepository repository;
  private final SoloAttemptService soloAttemptService;

  @Transactional(readOnly = true)
  public SoloAttemptRankingResponse forAttempt(UUID attemptId, UUID userId) {
    SoloAttempt attempt = soloAttemptService.getById(attemptId, userId);
    if (attempt.getState() != SoloAttemptState.COMPLETED) {
      throw new ConflictException(
          "Attempt " + attemptId + " was not completed, so it has no ranking",
          "ATTEMPT_NOT_COMPLETED");
    }

    long durationMs = attempt.getDurationMs();
    List<SoloAttempt> board =
        repository.findByCodeSnippetIdAndStateAndUserDeletedFalse(
            attempt.getCodeSnippet().getId(), SoloAttemptState.COMPLETED);

    List<SoloAttempt> earlierOwnRuns =
        board.stream()
            .filter(run -> isOwnedBy(run, userId) && !run.getId().equals(attemptId))
            .toList();
    Long previousBestDurationMs =
        earlierOwnRuns.stream()
            .map(SoloAttempt::getDurationMs)
            .min(Comparator.naturalOrder())
            .orElse(null);
    Integer previousBestCpm =
        earlierOwnRuns.stream()
            .map(SoloAttempt::getCpm)
            .max(Comparator.naturalOrder())
            .orElse(null);

    Collection<Long> rivalBestTimes =
        board.stream()
            .filter(run -> !isOwnedBy(run, userId))
            .collect(
                Collectors.toMap(
                    run -> run.getUser().getId(), SoloAttempt::getDurationMs, Long::min))
            .values();

    boolean newPersonalBest = previousBestDurationMs == null || durationMs < previousBestDurationMs;
    long bestDurationMs = newPersonalBest ? durationMs : previousBestDurationMs;

    return new SoloAttemptRankingResponse(
        attemptId,
        newPersonalBest,
        previousBestDurationMs,
        previousBestCpm,
        rankOf(rivalBestTimes, durationMs),
        rankOf(rivalBestTimes, bestDurationMs),
        previousBestDurationMs == null ? null : rankOf(rivalBestTimes, previousBestDurationMs));
  }

  /** Standard competition ranking, so tied times share a position. */
  private int rankOf(Collection<Long> rivalBestTimes, long durationMs) {
    long playersAhead = rivalBestTimes.stream().filter(best -> best < durationMs).count();
    return Math.toIntExact(playersAhead + 1);
  }

  private boolean isOwnedBy(SoloAttempt attempt, UUID userId) {
    return attempt.getUser().getId().equals(userId);
  }
}
