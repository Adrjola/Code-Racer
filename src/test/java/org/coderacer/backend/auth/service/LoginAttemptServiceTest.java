package org.coderacer.backend.auth.service;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import org.coderacer.backend.auth.exception.TooManyLoginAttemptsException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class LoginAttemptServiceTest {

  private LoginAttemptService service;

  @BeforeEach
  void setUp() {
    service =
        new LoginAttemptService(Clock.fixed(Instant.parse("2026-01-01T00:00:00Z"), ZoneOffset.UTC));
  }

  @Test
  void assertAllowed_blocksAfterTooManyFailuresForSameUsernameAndClient() {
    for (int i = 0; i < 5; i++) {
      service.recordFailure(" Player ", "127.0.0.1");
    }

    assertThatThrownBy(() -> service.assertAllowed("player", "127.0.0.1"))
        .isInstanceOf(TooManyLoginAttemptsException.class);
  }

  @Test
  void recordSuccessClearsFailures() {
    for (int i = 0; i < 5; i++) {
      service.recordFailure("player", "127.0.0.1");
    }

    service.recordSuccess("player", "127.0.0.1");

    service.assertAllowed("player", "127.0.0.1");
  }
}
