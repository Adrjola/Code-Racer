package org.coderacer.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;
import org.coderacer.backend.enums.Category;
import org.coderacer.backend.enums.Difficulty;
import org.coderacer.backend.enums.SnippetLifecycle;
import org.coderacer.backend.enums.SoloAttemptState;
import org.coderacer.backend.enums.UserRole;
import org.coderacer.backend.exception.OneActiveAttemptConflictException;
import org.coderacer.backend.exception.SoloAttemptNotActiveException;
import org.coderacer.backend.exception.SoloAttemptNotFoundException;
import org.coderacer.backend.exception.SoloAttemptOwnershipException;
import org.coderacer.backend.exception.SoloAttemptSnippetUnavailableException;
import org.coderacer.backend.model.CodeSnippet;
import org.coderacer.backend.model.SoloAttempt;
import org.coderacer.backend.model.User;
import org.coderacer.backend.repository.CodeSnippetRepository;
import org.coderacer.backend.repository.SoloAttemptRepository;
import org.coderacer.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class SoloAttemptServiceTest {

  @Mock private SoloAttemptRepository soloAttemptRepository;
  @Mock private UserRepository userRepository;
  @Mock private CodeSnippetRepository codeSnippetRepository;

  private ActiveAttemptStateStore activeAttemptStateStore;
  private SoloAttemptResultCalculator resultCalculator;
  private SoloAttemptLifecycleService lifecycleService;
  private Clock clock;
  private SoloAttemptService service;

  private final Instant now = Instant.parse("2026-01-01T00:00:00Z");
  private final UUID userId = UUID.randomUUID();
  private final UUID snippetId = UUID.randomUUID();
  private final UUID attemptId = UUID.randomUUID();

  @BeforeEach
  void setUp() {
    activeAttemptStateStore = new ActiveAttemptStateStore();
    resultCalculator = new SoloAttemptResultCalculator();
    lifecycleService = new SoloAttemptLifecycleService(soloAttemptRepository);
    clock = Clock.fixed(now, ZoneOffset.UTC);
    service =
        new SoloAttemptService(
            soloAttemptRepository,
            userRepository,
            codeSnippetRepository,
            activeAttemptStateStore,
            resultCalculator,
            lifecycleService,
            clock);
  }

  private User user() {
    User user = new User();
    user.setEmail("alice@example.com");
    user.setUsername("alice");
    user.setPasswordHash("hashed-password");
    user.setRole(UserRole.USER);
    user.setEmailVerified(true);
    user.setDeleted(false);
    ReflectionTestUtils.setField(user, "id", userId);
    return user;
  }

  private Category category() {
    return Category.JAVA;
  }

  private CodeSnippet snippet() {
    CodeSnippet snippet = new CodeSnippet("hello", "hello", "hash", Difficulty.EASY, category());
    ReflectionTestUtils.setField(snippet, "id", snippetId);
    return snippet;
  }

  private CodeSnippet snippet(SnippetLifecycle lifecycle) {
    CodeSnippet snippet = snippet();
    ReflectionTestUtils.setField(snippet, "lifecycle", lifecycle);
    return snippet;
  }

  private SoloAttempt newAttempt(Instant startedAt) {
    SoloAttempt attempt = new SoloAttempt(user(), snippet(), Difficulty.EASY, startedAt);
    ReflectionTestUtils.setField(attempt, "id", attemptId);
    return attempt;
  }

  @Test
  void startSavesNewAttemptInCountdownState() {
    when(userRepository.findById(userId)).thenReturn(Optional.of(user()));
    when(codeSnippetRepository.findById(snippetId)).thenReturn(Optional.of(snippet()));
    when(soloAttemptRepository.saveAndFlush(any(SoloAttempt.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));

    SoloAttempt result = service.start(userId, snippetId);

    assertThat(result.getState()).isEqualTo(SoloAttemptState.COUNTDOWN);
    assertThat(result.getDifficulty()).isEqualTo(Difficulty.EASY);
    assertThat(result.getStartedAt()).isEqualTo(now.plusSeconds(3));
  }

  @Test
  void startTranslatesConstraintViolationToConflict() {
    when(userRepository.findById(userId)).thenReturn(Optional.of(user()));
    when(codeSnippetRepository.findById(snippetId)).thenReturn(Optional.of(snippet()));
    when(soloAttemptRepository.saveAndFlush(any(SoloAttempt.class)))
        .thenThrow(new DataIntegrityViolationException("duplicate active attempt"));

    assertThrows(OneActiveAttemptConflictException.class, () -> service.start(userId, snippetId));
  }

  @Test
  void startThrowsNotFoundWhenUserMissing() {
    when(userRepository.findById(userId)).thenReturn(Optional.empty());

    assertThrows(SoloAttemptNotFoundException.class, () -> service.start(userId, snippetId));
  }

  @Test
  void startRejectsDeletedSnippet() {
    when(userRepository.findById(userId)).thenReturn(Optional.of(user()));
    when(codeSnippetRepository.findById(snippetId))
        .thenReturn(Optional.of(snippet(SnippetLifecycle.DELETED)));

    assertThrows(
        SoloAttemptSnippetUnavailableException.class, () -> service.start(userId, snippetId));
  }

  @Test
  void submitProgressThrowsOwnershipExceptionForWrongUser() {
    SoloAttempt attempt = newAttempt(now.plusSeconds(3));
    when(soloAttemptRepository.findById(attemptId)).thenReturn(Optional.of(attempt));

    UUID otherUserId = UUID.randomUUID();
    assertThrows(
        SoloAttemptOwnershipException.class,
        () -> service.submitProgress(attemptId, otherUserId, 1, "h"));
  }

  @Test
  void submitProgressThrowsNotFoundForMissingAttempt() {
    when(soloAttemptRepository.findById(attemptId)).thenReturn(Optional.empty());

    assertThrows(
        SoloAttemptNotFoundException.class,
        () -> service.submitProgress(attemptId, userId, 1, "h"));
  }

  @Test
  void submitProgressRejectsProgressBeforeStartedAt() {
    SoloAttempt attempt = newAttempt(now.plusSeconds(3));
    when(soloAttemptRepository.findById(attemptId)).thenReturn(Optional.of(attempt));

    assertThrows(
        SoloAttemptNotActiveException.class,
        () -> service.submitProgress(attemptId, userId, 1, "h"));
  }

  @Test
  void submitProgressActivatesAndAdvancesOffsetOnceStarted() {
    SoloAttempt attempt = newAttempt(now.minusSeconds(1));
    when(soloAttemptRepository.findById(attemptId)).thenReturn(Optional.of(attempt));
    when(soloAttemptRepository.saveAndFlush(any(SoloAttempt.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));

    ProgressResult result = service.submitProgress(attemptId, userId, 1, "he");

    assertThat(result.attempt().getState()).isEqualTo(SoloAttemptState.ACTIVE);
    assertThat(result.acceptedOffset()).isEqualTo(2);
  }

  @Test
  void submitProgressCompletesWhenOffsetReachesCanonicalLength() {
    SoloAttempt attempt = newAttempt(now.minusSeconds(1));
    when(soloAttemptRepository.findById(attemptId)).thenReturn(Optional.of(attempt));
    when(soloAttemptRepository.saveAndFlush(any(SoloAttempt.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));

    ProgressResult result = service.submitProgress(attemptId, userId, 1, "hello");

    assertThat(result.attempt().getState()).isEqualTo(SoloAttemptState.COMPLETED);
    assertThat(result.attempt().getCpm()).isNotNull();
    assertThat(result.attempt().getDurationMs()).isNotNull();
    assertThat(activeAttemptStateStore.get(attemptId)).isEmpty();
  }

  @Test
  void submitProgressReturnsExistingResultWhenAlreadyCompleted() {
    SoloAttempt attempt = newAttempt(now.minusSeconds(10));
    attempt.activate();
    attempt.complete(now.minusSeconds(1), 5000, 60);
    when(soloAttemptRepository.findById(attemptId)).thenReturn(Optional.of(attempt));

    ProgressResult result = service.submitProgress(attemptId, userId, 1, "hello");

    assertThat(result.attempt().getState()).isEqualTo(SoloAttemptState.COMPLETED);
    assertThat(result.attempt().getCpm()).isEqualTo(60);
    verify(soloAttemptRepository, never()).saveAndFlush(any());
  }

  @Test
  void submitProgressRejectsProgressOnAbandonedAttempt() {
    SoloAttempt attempt = newAttempt(now.minusSeconds(10));
    attempt.abandon();
    when(soloAttemptRepository.findById(attemptId)).thenReturn(Optional.of(attempt));

    assertThrows(
        SoloAttemptNotActiveException.class,
        () -> service.submitProgress(attemptId, userId, 1, "hello"));
  }

  @Test
  void abandonTranslatesIllegalTransitionToConflict() {
    SoloAttempt attempt = newAttempt(now.minusSeconds(10));
    attempt.activate();
    attempt.complete(now.minusSeconds(1), 5000, 60);
    when(soloAttemptRepository.findById(attemptId)).thenReturn(Optional.of(attempt));

    assertThrows(SoloAttemptNotActiveException.class, () -> service.abandon(attemptId, userId));
  }

  @Test
  void abandonSucceedsForActiveAttempt() {
    SoloAttempt attempt = newAttempt(now.minusSeconds(10));
    attempt.activate();
    when(soloAttemptRepository.findById(attemptId)).thenReturn(Optional.of(attempt));
    when(soloAttemptRepository.save(any(SoloAttempt.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));

    SoloAttempt result = service.abandon(attemptId, userId);

    assertThat(result.getState()).isEqualTo(SoloAttemptState.ABANDONED);
  }
}
