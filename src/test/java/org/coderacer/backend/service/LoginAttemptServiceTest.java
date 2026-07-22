package org.coderacer.backend.service;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import org.coderacer.backend.exception.TooManyLoginAttemptsException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class LoginAttemptServiceTest {

  private TestClock clock;
  private LoginAttemptService service;

  @BeforeEach
  void setUp() {
    clock = new TestClock(Instant.parse("2026-01-01T00:00:00Z"));
    service = new LoginAttemptService(clock);
  }

  @Test
  void assertAllowed_blocksAfterTooManyFailuresForSameUsernameAndClient() {
    recordFailures(5, " Player ", "127.0.0.1");

    assertThatThrownBy(() -> service.assertAllowed("player", "127.0.0.1"))
        .isInstanceOf(TooManyLoginAttemptsException.class);
  }

  @Test
  void recordSuccessClearsFailures() {
    recordFailures(5, "player", "127.0.0.1");

    service.recordSuccess("player", "127.0.0.1");

    assertThatCode(() -> service.assertAllowed("player", "127.0.0.1")).doesNotThrowAnyException();
  }

  @Test
  void assertAllowed_allowsRetryOnceLockoutExpires() {
    recordFailures(5, "player", "127.0.0.1");

    clock.advance(Duration.ofMinutes(16));

    assertThatCode(() -> service.assertAllowed("player", "127.0.0.1")).doesNotThrowAnyException();
  }

  @Test
  void assertAllowed_allowsWhileBelowFailureThreshold() {
    recordFailures(4, "player", "127.0.0.1");

    assertThatCode(() -> service.assertAllowed("player", "127.0.0.1")).doesNotThrowAnyException();
  }

  @Test
  void assertAllowed_forgetsStaleFailuresSoTheCounterRestarts() {
    recordFailures(4, "player", "127.0.0.1");

    clock.advance(Duration.ofHours(2));
    service.assertAllowed("player", "127.0.0.1");
    recordFailures(4, "player", "127.0.0.1");

    assertThatCode(() -> service.assertAllowed("player", "127.0.0.1")).doesNotThrowAnyException();
  }

  @Test
  void identifierWhitespaceAndCaseResolveToTheSameAttemptKey() {
    recordFailures(5, " Player ", "127.0.0.1");

    assertThatThrownBy(() -> service.assertAllowed("player", "127.0.0.1"))
        .isInstanceOf(TooManyLoginAttemptsException.class);
  }

  private void recordFailures(int count, String username, String clientAddress) {
    for (int i = 0; i < count; i++) {
      service.recordFailure(username, clientAddress);
    }
  }

  private static final class TestClock extends Clock {

    private Instant instant;

    private TestClock(Instant instant) {
      this.instant = instant;
    }

    private void advance(Duration duration) {
      instant = instant.plus(duration);
    }

    @Override
    public ZoneId getZone() {
      return ZoneOffset.UTC;
    }

    @Override
    public Clock withZone(ZoneId zone) {
      return this;
    }

    @Override
    public Instant instant() {
      return instant;
    }
  }
}
