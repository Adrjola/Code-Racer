package org.coderacer.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.coderacer.backend.enums.Category;
import org.coderacer.backend.enums.Difficulty;
import org.coderacer.backend.exception.ImplausibleRateException;
import org.coderacer.backend.exception.ProgressMismatchException;
import org.coderacer.backend.exception.ProgressSequenceException;
import org.coderacer.backend.model.CodeSnippet;
import org.coderacer.backend.model.SoloAttempt;
import org.coderacer.backend.model.User;
import org.coderacer.backend.repository.SoloAttemptRepository;
import org.coderacer.backend.util.CanonicalText;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.stubbing.Answer;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class ActiveAttemptStateStoreTest {

  private static final int[] CANONICAL = CanonicalText.toCodePoints("hello");

  @Mock private SoloAttemptRepository repository;

  private final Map<UUID, SoloAttempt> rows = new HashMap<>();

  private ActiveAttemptStateStore store;

  @BeforeEach
  void setUp() {
    Answer<Optional<SoloAttempt>> row =
        invocation -> Optional.ofNullable(rows.get(invocation.<UUID>getArgument(0)));
    lenient().when(repository.findWithLockById(any())).thenAnswer(row);
    lenient().when(repository.findById(any())).thenAnswer(row);
    store = new ActiveAttemptStateStore(repository);
  }

  /** Progress lives on the attempt row, so every tracked attempt needs one to exist. */
  private UUID liveAttempt() {
    User user = new User();
    ReflectionTestUtils.setField(user, "id", UUID.randomUUID());
    CodeSnippet snippet = new CodeSnippet("hello", "hello", "hash", Difficulty.EASY, Category.JAVA);
    ReflectionTestUtils.setField(snippet, "id", UUID.randomUUID());
    SoloAttempt attempt =
        new SoloAttempt(user, snippet, Difficulty.EASY, Instant.parse("2026-01-01T00:00:00Z"));
    ReflectionTestUtils.setField(attempt, "id", UUID.randomUUID());
    attempt.activate();
    rows.put(attempt.getId(), attempt);
    return attempt.getId();
  }

  @Test
  void registerInitializesOffsetZeroAndSequenceZero() {
    UUID id = liveAttempt();
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
    UUID id = liveAttempt();
    Instant now = Instant.parse("2026-01-01T00:00:00Z");
    store.register(id, now);
    store.applyDelta(id, 1, CanonicalText.toCodePoints("he"), CANONICAL, now, now.plusSeconds(1));

    store.register(id, now.plusSeconds(2));

    assertThat(store.get(id)).contains(new ActiveProgress(2, 1, now.plusSeconds(1)));
  }

  @Test
  void appliesFirstDeltaInSequence() {
    UUID id = liveAttempt();
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
    UUID id = liveAttempt();
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
    UUID id = liveAttempt();
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
    UUID id = liveAttempt();
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
    UUID id = liveAttempt();
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
    UUID id = liveAttempt();
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
    UUID id = liveAttempt();
    Instant now = Instant.parse("2026-01-01T00:00:00Z");
    store.register(id, now);
    assertThrows(
        ImplausibleRateException.class,
        () -> store.applyDelta(id, 1, LONG_SNIPPET, LONG_SNIPPET, now, now.plusMillis(1)));
  }

  @Test
  void acceptsBatchesThatArriveFasterThanTheyWereTyped() {
    UUID id = liveAttempt();
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
