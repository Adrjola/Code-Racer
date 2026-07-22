package org.coderacer.backend.service;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.coderacer.backend.exception.ImplausibleRateException;
import org.coderacer.backend.exception.ProgressMismatchException;
import org.coderacer.backend.exception.ProgressSequenceException;
import org.coderacer.backend.model.SoloAttempt;
import org.coderacer.backend.repository.SoloAttemptRepository;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Live typing progress for races in flight. The state lives on the attempt row rather than in
 * memory, so a backend restart no longer loses a race that is still being typed.
 *
 * <p>Each method is transactional in its own right, so it joins an ambient transaction when the
 * caller already has one - the TTL sweeper, which has already touched these rows - and otherwise
 * opens its own. Progress submission is the latter case: it drives the store per keystroke batch
 * without a surrounding transaction, so each call is a short transaction of its own.
 */
@Component
@RequiredArgsConstructor
public class ActiveAttemptStateStore {

  private static final int MAX_PLAUSIBLE_CPM = 1200;

  /**
   * Characters allowed on top of the sustained budget. The client batches keystrokes and sends them
   * a debounce apart, so a single delta always looks faster than the player actually typed.
   */
  private static final int BURST_ALLOWANCE = 60;

  private final SoloAttemptRepository repository;

  /** Starts tracking an attempt, leaving an already tracked one untouched. */
  @Transactional
  public void register(UUID attemptId, Instant activatedAt) {
    repository
        .findWithLockById(attemptId)
        .filter(attempt -> attempt.getLastProgressAt() == null)
        .ifPresent(attempt -> attempt.recordProgress(0, 0, activatedAt));
  }

  /** Empty once an attempt is finished or was never registered, which callers treat as gone. */
  @Transactional(readOnly = true)
  public Optional<ActiveProgress> get(UUID attemptId) {
    return repository.findById(attemptId).flatMap(ActiveAttemptStateStore::toProgress);
  }

  /** Stops tracking an attempt, keeping the offset it reached for the finished row. */
  @Transactional
  public void remove(UUID attemptId) {
    repository
        .findWithLockById(attemptId)
        .ifPresent(attempt -> attempt.recordProgress(attempt.getAcceptedOffset(), 0, null));
  }

  @Transactional
  public ActiveProgress applyDelta(
      UUID attemptId,
      long sequence,
      int[] deltaCodePoints,
      int[] canonicalCodePoints,
      Instant startedAt,
      Instant now) {
    SoloAttempt attempt =
        repository
            .findWithLockById(attemptId)
            .filter(candidate -> candidate.getLastProgressAt() != null)
            .orElseThrow(
                () ->
                    new ProgressSequenceException(
                        "No active progress state for attempt " + attemptId));

    if (sequence == attempt.getLastSequence()) {
      return toProgress(attempt).orElseThrow();
    }
    long expectedSequence = attempt.getLastSequence() + 1;
    if (sequence != expectedSequence) {
      throw new ProgressSequenceException(
          "Expected sequence " + expectedSequence + " but received " + sequence);
    }

    int offset = getOffset(deltaCodePoints, canonicalCodePoints, attempt.getAcceptedOffset());
    int totalAccepted = offset + deltaCodePoints.length;
    requirePlausibleRate(totalAccepted, startedAt, now);

    attempt.recordProgress(totalAccepted, sequence, now);
    return new ActiveProgress(totalAccepted, sequence, now);
  }

  private static Optional<ActiveProgress> toProgress(SoloAttempt attempt) {
    return Optional.ofNullable(attempt.getLastProgressAt())
        .map(
            lastProgressAt ->
                new ActiveProgress(
                    attempt.getAcceptedOffset(), attempt.getLastSequence(), lastProgressAt));
  }

  /**
   * Judges the whole run rather than one delta. Measuring a single batch against the gap since the
   * previous one measures how the client batches, not how fast the player types.
   */
  private static void requirePlausibleRate(int totalAccepted, Instant startedAt, Instant now) {
    double elapsedMinutes = Math.max(Duration.between(startedAt, now).toMillis(), 1) / 60000.0;
    double allowed = MAX_PLAUSIBLE_CPM * elapsedMinutes + BURST_ALLOWANCE;
    if (totalAccepted > allowed) {
      throw new ImplausibleRateException("Progress implies an impossible typing rate");
    }
  }

  private static int getOffset(int[] deltaCodePoints, int[] canonicalCodePoints, int offset) {
    if (offset + deltaCodePoints.length > canonicalCodePoints.length) {
      throw new ProgressMismatchException("Delta exceeds canonical snippet length");
    }
    for (int i = 0; i < deltaCodePoints.length; i++) {
      if (canonicalCodePoints[offset + i] != deltaCodePoints[i]) {
        throw new ProgressMismatchException("Delta does not match canonical snippet text");
      }
    }
    return offset;
  }
}
