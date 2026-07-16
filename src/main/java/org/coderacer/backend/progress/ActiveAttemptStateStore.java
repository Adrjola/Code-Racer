package org.coderacer.backend.progress;

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

  private final Map<UUID, ActiveProgress> progressByAttemptId = new ConcurrentHashMap<>();

  public void register(UUID attemptId, Instant activatedAt) {
    progressByAttemptId.put(attemptId, new ActiveProgress(0, 0, activatedAt));
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

          long elapsedMs = Math.max(Duration.between(current.lastActivityAt(), now).toMillis(), 1);
          double impliedCpm = deltaCodePoints.length / (elapsedMs / 60000.0);
          if (impliedCpm > MAX_PLAUSIBLE_CPM) {
            throw new ImplausibleRateException("Delta implies an impossible typing rate");
          }

          return new ActiveProgress(offset + deltaCodePoints.length, sequence, now);
        });
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
