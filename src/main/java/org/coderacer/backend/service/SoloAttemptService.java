package org.coderacer.backend.service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.coderacer.backend.enums.SnippetLifecycle;
import org.coderacer.backend.enums.SoloAttemptState;
import org.coderacer.backend.exception.IllegalSoloAttemptStateTransitionException;
import org.coderacer.backend.exception.OneActiveAttemptConflictException;
import org.coderacer.backend.exception.ProgressSequenceException;
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
import org.coderacer.backend.util.CanonicalText;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SoloAttemptService {

  private static final Duration COUNTDOWN_DURATION = Duration.ofSeconds(3);

  private final SoloAttemptRepository soloAttemptRepository;
  private final UserRepository userRepository;
  private final CodeSnippetRepository codeSnippetRepository;
  private final ActiveAttemptStateStore activeAttemptStateStore;
  private final SoloAttemptResultCalculator resultCalculator;
  private final SoloAttemptLifecycleService lifecycleService;
  private final SoloAttemptStaleness staleness;
  private final Clock clock;

  public SoloAttemptService(
      SoloAttemptRepository soloAttemptRepository,
      UserRepository userRepository,
      CodeSnippetRepository codeSnippetRepository,
      ActiveAttemptStateStore activeAttemptStateStore,
      SoloAttemptResultCalculator resultCalculator,
      SoloAttemptLifecycleService lifecycleService,
      SoloAttemptStaleness staleness,
      Clock clock) {
    this.soloAttemptRepository = soloAttemptRepository;
    this.userRepository = userRepository;
    this.codeSnippetRepository = codeSnippetRepository;
    this.activeAttemptStateStore = activeAttemptStateStore;
    this.resultCalculator = resultCalculator;
    this.lifecycleService = lifecycleService;
    this.staleness = staleness;
    this.clock = clock;
  }

  @Transactional
  public SoloAttempt start(UUID userId, UUID codeSnippetId) {
    User user =
        userRepository.findById(userId).orElseThrow(() -> new SoloAttemptNotFoundException(userId));
    CodeSnippet snippet =
        codeSnippetRepository
            .findById(codeSnippetId)
            .orElseThrow(() -> new SoloAttemptNotFoundException(codeSnippetId));
    if (snippet.getLifecycle() != SnippetLifecycle.ACTIVE) {
      throw new SoloAttemptSnippetUnavailableException(
          "Code snippet "
              + codeSnippetId
              + " is not available (lifecycle="
              + snippet.getLifecycle()
              + ")");
    }

    Instant now = clock.instant();
    releaseStaleAttempt(userId, now);

    SoloAttempt attempt =
        new SoloAttempt(user, snippet, snippet.getDifficulty(), now.plus(COUNTDOWN_DURATION));

    try {
      return soloAttemptRepository.saveAndFlush(attempt);
    } catch (DataIntegrityViolationException e) {
      throw new OneActiveAttemptConflictException(
          "User " + userId + " already has an active solo attempt");
    }
  }

  public ProgressResult submitProgress(
      UUID attemptId, UUID userId, long sequence, String rawDelta) {
    SoloAttempt attempt = getOwnedAttempt(attemptId, userId);
    Instant now = clock.instant();

    int[] canonicalCodePoints =
        CanonicalText.toCodePoints(
            CanonicalText.canonicalizeLineEndings(attempt.getCodeSnippet().getSource()));

    if (attempt.getState() == SoloAttemptState.COMPLETED) {
      return new ProgressResult(attempt, canonicalCodePoints.length);
    }

    if (attempt.getState() == SoloAttemptState.COUNTDOWN) {
      if (now.isBefore(attempt.getStartedAt())) {
        throw new SoloAttemptNotActiveException("Attempt has not started yet");
      }
      attempt = lifecycleService.activate(attemptId);
      activeAttemptStateStore.register(attempt.getId(), attempt.getStartedAt());
    }

    if (attempt.getState() != SoloAttemptState.ACTIVE) {
      throw new SoloAttemptNotActiveException(
          "Attempt is not active (state=" + attempt.getState() + ")");
    }

    if (activeAttemptStateStore.get(attempt.getId()).isEmpty()) {
      SoloAttempt refreshed = getOwnedAttempt(attemptId, userId);
      if (refreshed.getState() == SoloAttemptState.COMPLETED) {
        return new ProgressResult(refreshed, canonicalCodePoints.length);
      }
      lifecycleService.invalidate(attempt.getId());
      throw new SoloAttemptNotActiveException(
          "Live progress state unavailable; attempt invalidated");
    }

    int[] deltaCodePoints =
        CanonicalText.toCodePoints(CanonicalText.canonicalizeLineEndings(rawDelta));
    ActiveProgress progress;
    try {
      progress =
          activeAttemptStateStore.applyDelta(
              attempt.getId(),
              sequence,
              deltaCodePoints,
              canonicalCodePoints,
              attempt.getStartedAt(),
              now);
    } catch (ProgressSequenceException e) {
      // The other copy of this batch may have finished the race and cleared the state.
      SoloAttempt finished = getOwnedAttempt(attemptId, userId);
      if (finished.getState() == SoloAttemptState.COMPLETED) {
        return new ProgressResult(finished, canonicalCodePoints.length);
      }
      throw e;
    }

    if (progress.acceptedOffset() < canonicalCodePoints.length) {
      return new ProgressResult(attempt, progress.acceptedOffset());
    }

    SoloAttemptResult result =
        resultCalculator.calculate(attempt.getStartedAt(), now, canonicalCodePoints.length);
    try {
      SoloAttempt completed =
          lifecycleService.tryComplete(attemptId, now, result.durationMs(), result.cpm());
      activeAttemptStateStore.remove(attempt.getId());
      return new ProgressResult(completed, canonicalCodePoints.length);
    } catch (OptimisticLockingFailureException | IllegalSoloAttemptStateTransitionException e) {
      activeAttemptStateStore.remove(attempt.getId());
      return new ProgressResult(getOwnedAttempt(attemptId, userId), canonicalCodePoints.length);
    }
  }

  /**
   * A tab closed mid-race leaves an attempt marked live, and the one-active-attempt index then
   * blocks every new race until the sweeper catches up - up to half an hour for one that never got
   * past its countdown. Retiring it here closes that window, while an attempt that is genuinely
   * still being raced is left alone and still conflicts.
   */
  private void releaseStaleAttempt(UUID userId, Instant now) {
    soloAttemptRepository
        .findFirstWithLockByUserIdAndStateIn(
            userId, List.of(SoloAttemptState.COUNTDOWN, SoloAttemptState.ACTIVE))
        .filter(existing -> staleness.isStale(existing, now))
        .ifPresent(
            existing -> {
              if (existing.getState() == SoloAttemptState.COUNTDOWN) {
                existing.activate();
              }
              existing.expire();
              soloAttemptRepository.saveAndFlush(existing);
              activeAttemptStateStore.remove(existing.getId());
            });
  }

  @Transactional
  public SoloAttempt abandon(UUID attemptId, UUID userId) {
    SoloAttempt attempt = getOwnedAttempt(attemptId, userId);
    try {
      attempt.abandon();
    } catch (IllegalSoloAttemptStateTransitionException e) {
      throw new SoloAttemptNotActiveException(
          "Cannot abandon attempt in state " + attempt.getState());
    }
    activeAttemptStateStore.remove(attemptId);
    return soloAttemptRepository.save(attempt);
  }

  @Transactional(readOnly = true)
  public SoloAttempt getById(UUID attemptId, UUID userId) {
    return getOwnedAttempt(attemptId, userId);
  }

  private SoloAttempt getOwnedAttempt(UUID attemptId, UUID userId) {
    SoloAttempt attempt =
        soloAttemptRepository
            .findById(attemptId)
            .orElseThrow(() -> new SoloAttemptNotFoundException(attemptId));
    if (!attempt.getUser().getId().equals(userId)) {
      throw new SoloAttemptOwnershipException(
          "Attempt " + attemptId + " does not belong to user " + userId);
    }
    return attempt;
  }
}
