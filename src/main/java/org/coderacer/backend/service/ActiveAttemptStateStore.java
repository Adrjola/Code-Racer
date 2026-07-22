package org.coderacer.backend.service;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.coderacer.backend.exception.ImplausibleRateException;
import org.coderacer.backend.exception.ProgressMismatchException;
import org.coderacer.backend.exception.ProgressSequenceException;
import org.springframework.stereotype.Component;

@Component
public class ActiveAttemptStateStore {

  private static final int MAX_PLAUSIBLE_CPM = 1200;

  /**
   * Characters allowed on top of the sustained budget. The client batches keystrokes and sends them
   * a debounce apart, so a single delta always looks faster than the player actually typed.
   */
  private static final int BURST_ALLOWANCE = 60;

  private final Map<UUID, ActiveProgress> progressByAttemptId = new ConcurrentHashMap<>();

  public void register(UUID attemptId, Instant activatedAt) {
    progressByAttemptId.putIfAbsent(attemptId, new ActiveProgress(0, 0, activatedAt));
  }

  public Optional<ActiveProgress> get(UUID attemptId) {
    return Optional.ofNullable(progressByAttemptId.get(attemptId));
  }

  public void remove(UUID attemptId) {
    progressByAttemptId.remove(attemptId);
  }

  public ActiveProgress applyDelta(
      UUID attemptId,
      long sequence,
      int[] deltaCodePoints,
      int[] canonicalCodePoints,
      Instant startedAt,
      Instant now) {
    return progressByAttemptId.compute(
        attemptId,
        (id, current) -> {
          if (current == null) {
            throw new ProgressSequenceException("No active progress state for attempt " + id);
          }
          if (sequence == current.lastSequence()) {
            return current;
          }
          long expectedSequence = current.lastSequence() + 1;
          if (sequence != expectedSequence) {
            throw new ProgressSequenceException(
                "Expected sequence " + expectedSequence + " but received " + sequence);
          }

          int offset = getOffset(deltaCodePoints, canonicalCodePoints, current);
          int totalAccepted = offset + deltaCodePoints.length;
          requirePlausibleRate(totalAccepted, startedAt, now);

          return new ActiveProgress(totalAccepted, sequence, now);
        });
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

  private static int getOffset(
      int[] deltaCodePoints, int[] canonicalCodePoints, ActiveProgress current) {
    int offset = current.acceptedOffset();
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
