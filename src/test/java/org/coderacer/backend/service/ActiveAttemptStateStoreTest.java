package org.coderacer.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.time.Instant;
import java.util.UUID;
import org.coderacer.backend.exception.ImplausibleRateException;
import org.coderacer.backend.exception.ProgressMismatchException;
import org.coderacer.backend.exception.ProgressSequenceException;
import org.coderacer.backend.util.CanonicalText;
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
  void reregisteringDoesNotResetAlreadyAdvancedProgress() {
    UUID id = UUID.randomUUID();
    Instant now = Instant.parse("2026-01-01T00:00:00Z");
    store.register(id, now);
    store.applyDelta(id, 1, CanonicalText.toCodePoints("he"), CANONICAL, now, now.plusSeconds(1));

    store.register(id, now.plusSeconds(2));

    assertThat(store.get(id)).contains(new ActiveProgress(2, 1, now.plusSeconds(1)));
  }

  @Test
  void appliesFirstDeltaInSequence() {
    UUID id = UUID.randomUUID();
    Instant now = Instant.parse("2026-01-01T00:00:00Z");
    store.register(id, now);
    ActiveProgress progress =
        store.applyDelta(
            id, 1, CanonicalText.toCodePoints("he"), CANONICAL, now, now.plusSeconds(1));
    assertThat(progress.acceptedOffset()).isEqualTo(2);
    assertThat(progress.lastSequence()).isEqualTo(1);
  }

  @Test
  void resendingLastSequenceIsIdempotent() {
    UUID id = UUID.randomUUID();
    Instant now = Instant.parse("2026-01-01T00:00:00Z");
    store.register(id, now);
    ActiveProgress first =
        store.applyDelta(
            id, 1, CanonicalText.toCodePoints("he"), CANONICAL, now, now.plusSeconds(1));
    ActiveProgress retry =
        store.applyDelta(
            id, 1, CanonicalText.toCodePoints("he"), CANONICAL, now, now.plusSeconds(5));
    assertThat(retry).isEqualTo(first);
  }

  @Test
  void rejectsSkippedSequence() {
    UUID id = UUID.randomUUID();
    Instant now = Instant.parse("2026-01-01T00:00:00Z");
    store.register(id, now);
    assertThrows(
        ProgressSequenceException.class,
        () ->
            store.applyDelta(
                id, 2, CanonicalText.toCodePoints("he"), CANONICAL, now, now.plusSeconds(1)));
  }

  @Test
  void rejectsStaleSequenceOlderThanLastAccepted() {
    UUID id = UUID.randomUUID();
    Instant now = Instant.parse("2026-01-01T00:00:00Z");
    store.register(id, now);
    store.applyDelta(id, 1, CanonicalText.toCodePoints("h"), CANONICAL, now, now.plusSeconds(1));
    store.applyDelta(id, 2, CanonicalText.toCodePoints("e"), CANONICAL, now, now.plusSeconds(2));
    assertThrows(
        ProgressSequenceException.class,
        () ->
            store.applyDelta(
                id, 1, CanonicalText.toCodePoints("h"), CANONICAL, now, now.plusSeconds(3)));
  }

  private static final String LONG_TEXT =
      "public int sum(int[] numbers) { int total = 0; return total; }";
  private static final int[] LONG_SNIPPET = CanonicalText.toCodePoints(LONG_TEXT);

  @Test
  void rejectsMismatchedCharacters() {
    UUID id = UUID.randomUUID();
    Instant now = Instant.parse("2026-01-01T00:00:00Z");
    store.register(id, now);
    assertThrows(
        ProgressMismatchException.class,
        () ->
            store.applyDelta(
                id, 1, CanonicalText.toCodePoints("xx"), CANONICAL, now, now.plusSeconds(1)));
  }

  @Test
  void rejectsDeltaExceedingCanonicalLength() {
    UUID id = UUID.randomUUID();
    Instant now = Instant.parse("2026-01-01T00:00:00Z");
    store.register(id, now);
    assertThrows(
        ProgressMismatchException.class,
        () ->
            store.applyDelta(
                id,
                1,
                CanonicalText.toCodePoints("hello world"),
                CANONICAL,
                now,
                now.plusSeconds(1)));
  }

  @Test
  void rejectsDeltaForUnregisteredAttempt() {
    assertThrows(
        ProgressSequenceException.class,
        () ->
            store.applyDelta(
                UUID.randomUUID(),
                1,
                CanonicalText.toCodePoints("h"),
                CANONICAL,
                Instant.now(),
                Instant.now()));
  }

  @Test
  void rejectsImplausibleRate() {
    UUID id = UUID.randomUUID();
    Instant now = Instant.parse("2026-01-01T00:00:00Z");
    store.register(id, now);
    assertThrows(
        ImplausibleRateException.class,
        () -> store.applyDelta(id, 1, LONG_SNIPPET, LONG_SNIPPET, now, now.plusMillis(1)));
  }

  @Test
  void acceptsBatchesThatArriveFasterThanTheyWereTyped() {
    UUID id = UUID.randomUUID();
    Instant startedAt = Instant.parse("2026-01-01T00:00:00Z");
    store.register(id, startedAt);

    // The client debounces, so a burst reaches the server as back-to-back full
    // batches. Judged per delta these look like 1600 cpm and were rejected,
    // which stranded the attempt until it expired.
    int[] all = CanonicalText.toCodePoints(LONG_TEXT);
    long sequence = 0;
    for (int offset = 0; offset < all.length; offset += 8) {
      int[] batch = java.util.Arrays.copyOfRange(all, offset, Math.min(offset + 8, all.length));
      sequence += 1;
      store.applyDelta(id, sequence, batch, all, startedAt, startedAt.plusMillis(300L * sequence));
    }

    assertThat(store.get(id).orElseThrow().acceptedOffset()).isEqualTo(all.length);
  }
}
