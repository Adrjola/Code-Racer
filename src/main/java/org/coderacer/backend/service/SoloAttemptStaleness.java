package org.coderacer.backend.service;

import java.time.Duration;
import java.time.Instant;
import org.coderacer.backend.enums.SoloAttemptState;
import org.coderacer.backend.model.SoloAttempt;
import org.springframework.stereotype.Component;

/**
 * When a race that is still marked live has actually been given up on. The TTL sweeper uses this to
 * clean up, and starting a race uses it to reclaim a dead attempt rather than making the player
 * wait for the next sweep.
 */
@Component
public class SoloAttemptStaleness {

  /** How long an active race may go without progress before it is considered gone. */
  static final Duration IDLE_TTL = Duration.ofSeconds(60);

  /**
   * How long past its own countdown an attempt may sit without a single keystroke reaching the
   * server. Anything longer means the player never really started.
   */
  static final Duration COUNTDOWN_GRACE = Duration.ofSeconds(60);

  static final Duration MAX_ATTEMPT_DURATION = Duration.ofMinutes(30);

  public boolean isStale(SoloAttempt attempt, Instant now) {
    if (elapsedSince(attempt.getStartedAt(), now).compareTo(MAX_ATTEMPT_DURATION) > 0) {
      return true;
    }
    if (attempt.getState() != SoloAttemptState.ACTIVE) {
      return elapsedSince(attempt.getStartedAt(), now).compareTo(COUNTDOWN_GRACE) > 0;
    }
    // No progress at all on an active race means the live state was lost.
    return attempt.getLastProgressAt() == null
        || elapsedSince(attempt.getLastProgressAt(), now).compareTo(IDLE_TTL) > 0;
  }

  private static Duration elapsedSince(Instant from, Instant now) {
    return Duration.between(from, now);
  }
}
