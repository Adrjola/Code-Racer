package org.coderacer.backend.service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import org.coderacer.backend.exception.TooManyLoginAttemptsException;
import org.springframework.stereotype.Service;

@Service
public class LoginAttemptService {

  private static final int MAX_FAILED_ATTEMPTS = 5;
  private static final Duration LOCKOUT_DURATION = Duration.ofMinutes(15);
  private static final Duration STALE_ATTEMPT_TTL = Duration.ofHours(1);
  private static final String UNKNOWN_CLIENT = "unknown";

  private final ConcurrentMap<LoginAttemptKey, AttemptState> attempts = new ConcurrentHashMap<>();
  private final Clock clock;

  public LoginAttemptService(Clock clock) {
    this.clock = clock;
  }

  public void assertAllowed(String identifier, String clientAddress) {
    LoginAttemptKey key = key(identifier, clientAddress);
    AttemptState state = attempts.get(key);
    if (state == null) {
      return;
    }

    Instant now = Instant.now(clock);
    if (state.lockedUntil() != null) {
      if (state.lockedUntil().isAfter(now)) {
        throw new TooManyLoginAttemptsException();
      }
      attempts.remove(key, state);
      return;
    }
    if (state.lastFailureAt().plus(STALE_ATTEMPT_TTL).isBefore(now)) {
      attempts.remove(key, state);
    }
  }

  public void recordSuccess(String identifier, String clientAddress) {
    attempts.remove(key(identifier, clientAddress));
  }

  public void recordFailure(String identifier, String clientAddress) {
    Instant now = Instant.now(clock);
    attempts.compute(
        key(identifier, clientAddress),
        (key, current) -> {
          int failedAttempts = current == null ? 1 : current.failedAttempts() + 1;
          Instant lockedUntil =
              failedAttempts >= MAX_FAILED_ATTEMPTS ? now.plus(LOCKOUT_DURATION) : null;
          return new AttemptState(failedAttempts, now, lockedUntil);
        });
  }

  private LoginAttemptKey key(String identifier, String clientAddress) {
    return new LoginAttemptKey(normalize(identifier), normalizeClient(clientAddress));
  }

  private String normalize(String value) {
    return value.trim().toLowerCase();
  }

  private String normalizeClient(String value) {
    return value == null || value.isBlank() ? UNKNOWN_CLIENT : value.trim();
  }

  private record LoginAttemptKey(String identifier, String clientAddress) {}

  private record AttemptState(int failedAttempts, Instant lastFailureAt, Instant lockedUntil) {}
}
