package org.coderacer.backend.auth.service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import org.coderacer.backend.auth.exception.TooManyLoginAttemptsException;
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

  public void assertAllowed(String username, String clientAddress) {
    LoginAttemptKey key = key(username, clientAddress);
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

  public void recordSuccess(String username, String clientAddress) {
    attempts.remove(key(username, clientAddress));
  }

  public void recordFailure(String username, String clientAddress) {
    Instant now = Instant.now(clock);
    attempts.compute(
        key(username, clientAddress),
        (key, current) -> {
          int failedAttempts = current == null ? 1 : current.failedAttempts() + 1;
          Instant lockedUntil =
              failedAttempts >= MAX_FAILED_ATTEMPTS ? now.plus(LOCKOUT_DURATION) : null;
          return new AttemptState(failedAttempts, now, lockedUntil);
        });
  }

  private LoginAttemptKey key(String username, String clientAddress) {
    return new LoginAttemptKey(normalize(username), normalizeClient(clientAddress));
  }

  private String normalize(String value) {
    return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
  }

  private String normalizeClient(String value) {
    return value == null || value.isBlank() ? UNKNOWN_CLIENT : value.trim();
  }

  private record LoginAttemptKey(String username, String clientAddress) {}

  private record AttemptState(int failedAttempts, Instant lastFailureAt, Instant lockedUntil) {}
}
