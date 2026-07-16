package org.coderacer.backend.soloattempt.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.coderacer.backend.soloattempt.exception.IllegalSoloAttemptStateTransitionException;
import org.coderacer.backend.soloattempt.exception.SoloAttemptNotFoundException;
import org.coderacer.backend.soloattempt.model.CodeSnippet;
import org.coderacer.backend.soloattempt.model.Difficulty;
import org.coderacer.backend.soloattempt.model.SoloAttempt;
import org.coderacer.backend.soloattempt.model.SoloAttemptState;
import org.coderacer.backend.soloattempt.repository.SoloAttemptRepository;
import org.coderacer.backend.user.model.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class SoloAttemptLifecycleWriterTest {

  @Mock private SoloAttemptRepository repository;

  private SoloAttemptLifecycleWriter writer;
  private final Instant startedAt = Instant.parse("2026-01-01T00:00:00Z");
  private final UUID attemptId = UUID.randomUUID();

  @BeforeEach
  void setUp() {
    writer = new SoloAttemptLifecycleWriter(repository);
  }

  private SoloAttempt newAttempt() {
    User user = new User();
    ReflectionTestUtils.setField(user, "id", UUID.randomUUID());
    CodeSnippet snippet = new CodeSnippet("hello", Difficulty.EASY);
    ReflectionTestUtils.setField(snippet, "id", UUID.randomUUID());
    SoloAttempt attempt = new SoloAttempt(user, snippet, Difficulty.EASY, startedAt);
    ReflectionTestUtils.setField(attempt, "id", attemptId);
    return attempt;
  }

  @Test
  void activateTransitionsCountdownAttemptAndSaves() {
    SoloAttempt attempt = newAttempt();
    when(repository.findById(attemptId)).thenReturn(Optional.of(attempt));
    when(repository.saveAndFlush(attempt)).thenReturn(attempt);

    SoloAttempt result = writer.activate(attemptId);

    assertThat(result.getState()).isEqualTo(SoloAttemptState.ACTIVE);
    verify(repository).saveAndFlush(attempt);
  }

  @Test
  void activateIsNoOpForAlreadyActiveAttempt() {
    SoloAttempt attempt = newAttempt();
    attempt.activate();
    when(repository.findById(attemptId)).thenReturn(Optional.of(attempt));

    SoloAttempt result = writer.activate(attemptId);

    assertThat(result.getState()).isEqualTo(SoloAttemptState.ACTIVE);
    verify(repository, never()).saveAndFlush(any());
  }

  @Test
  void activateThrowsNotFoundForMissingAttempt() {
    when(repository.findById(attemptId)).thenReturn(Optional.empty());

    assertThrows(SoloAttemptNotFoundException.class, () -> writer.activate(attemptId));
  }

  @Test
  void invalidateTransitionsActiveAttemptAndSaves() {
    SoloAttempt attempt = newAttempt();
    attempt.activate();
    when(repository.findById(attemptId)).thenReturn(Optional.of(attempt));

    writer.invalidate(attemptId);

    assertThat(attempt.getState()).isEqualTo(SoloAttemptState.INVALIDATED);
    verify(repository).saveAndFlush(attempt);
  }

  @Test
  void invalidateIsNoOpForCountdownAttempt() {
    SoloAttempt attempt = newAttempt();
    when(repository.findById(attemptId)).thenReturn(Optional.of(attempt));

    writer.invalidate(attemptId);

    assertThat(attempt.getState()).isEqualTo(SoloAttemptState.COUNTDOWN);
    verify(repository, never()).saveAndFlush(any());
  }

  @Test
  void invalidateIsNoOpForTerminalAttempt() {
    SoloAttempt attempt = newAttempt();
    attempt.abandon();
    when(repository.findById(attemptId)).thenReturn(Optional.of(attempt));

    writer.invalidate(attemptId);

    assertThat(attempt.getState()).isEqualTo(SoloAttemptState.ABANDONED);
    verify(repository, never()).saveAndFlush(any());
  }

  @Test
  void invalidateIsNoOpForMissingAttempt() {
    when(repository.findById(attemptId)).thenReturn(Optional.empty());

    writer.invalidate(attemptId);

    verify(repository, never()).saveAndFlush(any());
  }

  @Test
  void tryCompleteTransitionsActiveAttemptAndSaves() {
    SoloAttempt attempt = newAttempt();
    attempt.activate();
    when(repository.findById(attemptId)).thenReturn(Optional.of(attempt));
    when(repository.saveAndFlush(attempt)).thenReturn(attempt);
    Instant finishedAt = startedAt.plusSeconds(45);

    SoloAttempt result = writer.tryComplete(attemptId, finishedAt, 45_000, 300);

    assertThat(result.getState()).isEqualTo(SoloAttemptState.COMPLETED);
    assertThat(result.getCpm()).isEqualTo(300);
  }

  @Test
  void tryCompleteThrowsForNonActiveAttempt() {
    SoloAttempt attempt = newAttempt();
    when(repository.findById(attemptId)).thenReturn(Optional.of(attempt));

    assertThrows(
        IllegalSoloAttemptStateTransitionException.class,
        () -> writer.tryComplete(attemptId, startedAt.plusSeconds(1), 1000, 60));
  }

  @Test
  void tryCompleteThrowsNotFoundForMissingAttempt() {
    when(repository.findById(attemptId)).thenReturn(Optional.empty());

    assertThrows(
        SoloAttemptNotFoundException.class,
        () -> writer.tryComplete(attemptId, startedAt.plusSeconds(1), 1000, 60));
  }
}
