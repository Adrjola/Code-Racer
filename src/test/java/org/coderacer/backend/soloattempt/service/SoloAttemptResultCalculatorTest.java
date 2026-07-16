package org.coderacer.backend.soloattempt.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.time.Instant;
import org.junit.jupiter.api.Test;

class SoloAttemptResultCalculatorTest {

  private final SoloAttemptResultCalculator calculator = new SoloAttemptResultCalculator();
  private final Instant startedAt = Instant.parse("2026-01-01T00:00:00Z");

  @Test
  void calculatesCpmForNormalDuration() {
    Instant finishedAt = startedAt.plusSeconds(45);
    SoloAttemptResult result = calculator.calculate(startedAt, finishedAt, 300);
    assertThat(result.durationMs()).isEqualTo(45_000);
    assertThat(result.cpm()).isEqualTo(400);
  }

  @Test
  void doesNotFloorDurationExactlyAtMinimum() {
    Instant finishedAt = startedAt.plusMillis(1000);
    SoloAttemptResult result = calculator.calculate(startedAt, finishedAt, 10);
    assertThat(result.durationMs()).isEqualTo(1000);
    assertThat(result.cpm()).isEqualTo(600);
  }

  @Test
  void floorsEffectiveDurationBelowMinimumButKeepsRealDuration() {
    Instant finishedAt = startedAt.plusMillis(500);
    SoloAttemptResult result = calculator.calculate(startedAt, finishedAt, 10);
    assertThat(result.durationMs()).isEqualTo(500);
    assertThat(result.cpm()).isEqualTo(600);
  }

  @Test
  void roundsHalfUp() {
    Instant finishedAt = startedAt.plusSeconds(120);
    SoloAttemptResult result = calculator.calculate(startedAt, finishedAt, 11);
    assertThat(result.cpm()).isEqualTo(6);
  }

  @Test
  void rejectsEmptyCanonicalLength() {
    Instant finishedAt = startedAt.plusSeconds(10);
    assertThrows(IllegalStateException.class, () -> calculator.calculate(startedAt, finishedAt, 0));
  }
}
