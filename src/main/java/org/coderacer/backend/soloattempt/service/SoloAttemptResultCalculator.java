package org.coderacer.backend.soloattempt.service;

import java.time.Duration;
import java.time.Instant;
import org.springframework.stereotype.Component;

@Component
public class SoloAttemptResultCalculator {

  private static final long MINIMUM_DURATION_MS = 1000;

  public SoloAttemptResult calculate(Instant startedAt, Instant finishedAt, int canonicalLength) {
    if (canonicalLength <= 0) {
      throw new IllegalStateException("Code snippet should not be empty");
    }
    long durationMs = Duration.between(startedAt, finishedAt).toMillis();
    long effectiveDurationMs = Math.max(durationMs, MINIMUM_DURATION_MS);
    double effectiveDurationMinutes = effectiveDurationMs / 60000.0;
    int cpm = (int) Math.round(canonicalLength / effectiveDurationMinutes);
    return new SoloAttemptResult(durationMs, cpm);
  }
}
