package org.coderacer.backend.progress;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.time.Instant;
import java.util.UUID;
import org.coderacer.backend.exception.ImplausibleRateException;
import org.coderacer.backend.exception.ProgressMismatchException;
import org.coderacer.backend.exception.ProgressSequenceException;
import org.coderacer.backend.service.CanonicalText;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class ActiveAttemptStateStoreTest {

  private static final int[] CANONICAL = CanonicalText.toCodePoints("hello");

  private ActiveAttemptStateStore store;

  @BeforeEach
  void setUp() {
    store = new ActiveAttemptStateStore();
  }

  @Test
  void registerInitializesOffsetZeroAndSequenceZero() {
    UUID id = UUID.randomUUID();
    Instant activatedAt = Instant.parse("2026-01-01T00:00:00Z");
    store.register(id, activatedAt);
    assertThat(store.get(id)).contains(new ActiveProgress(0, 0, activatedAt));
  }

  @Test
  void getReturnsEmptyForUnknownAttempt() {
    assertThat(store.get(UUID.randomUUID())).isEmpty();
  }

  @Test
  void appliesFirstDeltaInSequence() {
    UUID id = UUID.randomUUID();
    Instant now = Instant.parse("2026-01-01T00:00:00Z");
    store.register(id, now);
    ActiveProgress progress = store.applyDelta(id, 1, CanonicalText.toCodePoints("he"), CANONICAL, now.plusSeconds(1));
    assertThat(progress.acceptedOffset()).isEqualTo(2);
    assertThat(progress.lastSequence()).isEqualTo(1);
  }

  @Test
  void resendingLastSequenceIsIdempotent() {
    UUID id = UUID.randomUUID();
    Instant now = Instant.parse("2026-01-01T00:00:00Z");
    store.register(id, now);
    ActiveProgress first = store.applyDelta(id, 1, CanonicalText.toCodePoints("he"), CANONICAL, now.plusSeconds(1));
    ActiveProgress retry = store.applyDelta(id, 1, CanonicalText.toCodePoints("he"), CANONICAL, now.plusSeconds(5));
    assertThat(retry).isEqualTo(first);
  }

  @Test
  void rejectsSkippedSequence() {
    UUID id = UUID.randomUUID();
    Instant now = Instant.parse("2026-01-01T00:00:00Z");
    store.register(id, now);
    assertThrows(ProgressSequenceException.class, () -> store
            .applyDelta(id, 2, CanonicalText.toCodePoints("he"), CANONICAL, now.plusSeconds(1)));
  }

  @Test
  void rejectsStaleSequenceOlderThanLastAccepted() {
    UUID id = UUID.randomUUID();
    Instant now = Instant.parse("2026-01-01T00:00:00Z");
    store.register(id, now);
    store.applyDelta(id, 1, CanonicalText.toCodePoints("h"), CANONICAL, now.plusSeconds(1));
    store.applyDelta(id, 2, CanonicalText.toCodePoints("e"), CANONICAL, now.plusSeconds(2));
    assertThrows(ProgressSequenceException.class, () -> store
            .applyDelta(id, 1, CanonicalText.toCodePoints("h"), CANONICAL, now.plusSeconds(3)));
  }

  @Test
  void rejectsMismatchedCharacters() {
    UUID id = UUID.randomUUID();
    Instant now = Instant.parse("2026-01-01T00:00:00Z");
    store.register(id, now);
    assertThrows(ProgressMismatchException.class, () -> store
            .applyDelta(id, 1, CanonicalText.toCodePoints("xx"), CANONICAL, now.plusSeconds(1)));
  }

  @Test
  void rejectsDeltaExceedingCanonicalLength() {
    UUID id = UUID.randomUUID();
    Instant now = Instant.parse("2026-01-01T00:00:00Z");
    store.register(id, now);
    assertThrows(ProgressMismatchException.class, () -> store
            .applyDelta(id, 1, CanonicalText.toCodePoints("hello world"), CANONICAL, now.plusSeconds(1)));
  }

  @Test
  void rejectsDeltaForUnregisteredAttempt() {
    assertThrows(ProgressSequenceException.class, () -> store.
            applyDelta(UUID.randomUUID(), 1, CanonicalText.toCodePoints("h"), CANONICAL, Instant.now()));
  }

  @Test
  void rejectsImplausibleRate() {
    UUID id = UUID.randomUUID();
    Instant now = Instant.parse("2026-01-01T00:00:00Z");
    store.register(id, now);
    assertThrows(ImplausibleRateException.class, () -> store
            .applyDelta(id, 1, CANONICAL, CANONICAL, now.plusMillis(1)));
  }
}
