package org.coderacer.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.coderacer.backend.enums.Category;
import org.coderacer.backend.enums.Difficulty;
import org.coderacer.backend.enums.SoloAttemptState;
import org.coderacer.backend.model.CodeSnippet;
import org.coderacer.backend.model.SoloAttempt;
import org.coderacer.backend.model.User;
import org.coderacer.backend.repository.SoloAttemptRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.stubbing.Answer;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class SoloAttemptTtlSweeperTest {

  @Mock private SoloAttemptRepository soloAttemptRepository;

  private final Map<UUID, SoloAttempt> rows = new HashMap<>();

  private ActiveAttemptStateStore activeAttemptStateStore;
  private Instant now;
  private SoloAttemptTtlSweeper sweeper;

  @BeforeEach
  void setUp() {
    now = Instant.parse("2026-01-01T00:30:00Z");
    Clock clock = Clock.fixed(now, ZoneOffset.UTC);
    Answer<Optional<SoloAttempt>> row =
        invocation -> Optional.ofNullable(rows.get(invocation.<UUID>getArgument(0)));
    lenient().when(soloAttemptRepository.findWithLockById(any())).thenAnswer(row);
    lenient().when(soloAttemptRepository.findById(any())).thenAnswer(row);
    activeAttemptStateStore = new ActiveAttemptStateStore(soloAttemptRepository);
    sweeper =
        new SoloAttemptTtlSweeper(
            soloAttemptRepository, activeAttemptStateStore, new SoloAttemptStaleness(), clock);
  }

  private SoloAttempt newAttempt(Instant startedAt) {
    User user = new User();
    ReflectionTestUtils.setField(user, "id", UUID.randomUUID());
    Category category = Category.JAVA;
    CodeSnippet snippet = new CodeSnippet("hello", "hello", "hash", Difficulty.EASY, category);
    ReflectionTestUtils.setField(snippet, "id", UUID.randomUUID());
    SoloAttempt attempt = new SoloAttempt(user, snippet, Difficulty.EASY, startedAt);
    ReflectionTestUtils.setField(attempt, "id", UUID.randomUUID());
    rows.put(attempt.getId(), attempt);
    return attempt;
  }

  @Test
  void invalidatesActiveAttemptWithMissingLiveState() {
    SoloAttempt attempt = newAttempt(now.minusSeconds(10));
    attempt.activate();
    when(soloAttemptRepository.findByStateIn(any())).thenReturn(List.of(attempt));

    sweeper.sweep();

    assertThat(attempt.getState()).isEqualTo(SoloAttemptState.INVALIDATED);
    verify(soloAttemptRepository).save(attempt);
  }

  @Test
  void expiresActiveAttemptIdleTooLong() {
    SoloAttempt attempt = newAttempt(now.minusSeconds(10));
    attempt.activate();
    activeAttemptStateStore.register(attempt.getId(), now.minusSeconds(90));
    when(soloAttemptRepository.findByStateIn(any())).thenReturn(List.of(attempt));

    sweeper.sweep();

    assertThat(attempt.getState()).isEqualTo(SoloAttemptState.EXPIRED);
    verify(soloAttemptRepository).save(attempt);
    assertThat(activeAttemptStateStore.get(attempt.getId())).isEmpty();
  }

  @Test
  void expiresActiveAttemptRunningTooLongOverall() {
    SoloAttempt attempt = newAttempt(now.minus(Duration.ofMinutes(31)));
    attempt.activate();
    activeAttemptStateStore.register(attempt.getId(), now.minusSeconds(5));
    when(soloAttemptRepository.findByStateIn(any())).thenReturn(List.of(attempt));

    sweeper.sweep();

    assertThat(attempt.getState()).isEqualTo(SoloAttemptState.EXPIRED);
    verify(soloAttemptRepository).save(attempt);
  }

  @Test
  void leavesHealthyActiveAttemptUntouched() {
    SoloAttempt attempt = newAttempt(now.minusSeconds(10));
    attempt.activate();
    activeAttemptStateStore.register(attempt.getId(), now.minusSeconds(5));
    when(soloAttemptRepository.findByStateIn(any())).thenReturn(List.of(attempt));

    sweeper.sweep();

    assertThat(attempt.getState()).isEqualTo(SoloAttemptState.ACTIVE);
    verify(soloAttemptRepository, never()).save(any());
  }

  @Test
  void expiresCountdownAttemptStaleForTooLong() {
    SoloAttempt attempt = newAttempt(now.minus(Duration.ofMinutes(31)));
    when(soloAttemptRepository.findByStateIn(any())).thenReturn(List.of(attempt));

    sweeper.sweep();

    assertThat(attempt.getState()).isEqualTo(SoloAttemptState.EXPIRED);
    verify(soloAttemptRepository).save(attempt);
  }

  @Test
  void leavesFreshCountdownAttemptUntouched() {
    SoloAttempt attempt = newAttempt(now.minusSeconds(1));
    when(soloAttemptRepository.findByStateIn(any())).thenReturn(List.of(attempt));

    sweeper.sweep();

    assertThat(attempt.getState()).isEqualTo(SoloAttemptState.COUNTDOWN);
    verify(soloAttemptRepository, never()).save(any());
  }
}
