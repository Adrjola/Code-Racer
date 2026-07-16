package org.coderacer.backend.service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import org.coderacer.backend.exception.*;
import org.coderacer.backend.model.CodeSnippet;
import org.coderacer.backend.model.SoloAttempt;
import org.coderacer.backend.model.SoloAttemptState;
import org.coderacer.backend.model.User;
import org.coderacer.backend.progress.ActiveAttemptStateStore;
import org.coderacer.backend.progress.ActiveProgress;
import org.coderacer.backend.repository.CodeSnippetRepository;
import org.coderacer.backend.repository.SoloAttemptRepository;
import org.coderacer.backend.repository.UserRepository;
import org.springframework.dao.DataIntegrityViolationException;
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
  private final Clock clock;

  public SoloAttemptService(
      SoloAttemptRepository soloAttemptRepository,
      UserRepository userRepository,
      CodeSnippetRepository codeSnippetRepository,
      ActiveAttemptStateStore activeAttemptStateStore,
      SoloAttemptResultCalculator resultCalculator,
      Clock clock) {
    this.soloAttemptRepository = soloAttemptRepository;
    this.userRepository = userRepository;
    this.codeSnippetRepository = codeSnippetRepository;
    this.activeAttemptStateStore = activeAttemptStateStore;
    this.resultCalculator = resultCalculator;
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

    Instant startedAt = clock.instant().plus(COUNTDOWN_DURATION);
    SoloAttempt attempt = new SoloAttempt(user, snippet, snippet.getDifficulty(), startedAt);

    try {
      return soloAttemptRepository.saveAndFlush(attempt);
    } catch (DataIntegrityViolationException e) {
      throw new OneActiveAttemptConflictException(
          "User " + userId + " already has an active solo attempt");
    }
  }

  @Transactional(noRollbackFor = SoloAttemptNotActiveException.class)
  public ProgressResult submitProgress(
      UUID attemptId, UUID userId, long sequence, String rawDelta) {
    SoloAttempt attempt = getOwnedAttempt(attemptId, userId);
    Instant now = clock.instant();

    int[] canonicalCodePoints =
        CanonicalText.toCodePoints(
            CanonicalText.canonicalizeLineEndings(attempt.getCodeSnippet().getContent()));

    if (attempt.getState() == SoloAttemptState.COMPLETED) {
      return new ProgressResult(attempt, canonicalCodePoints.length);
    }

    if (attempt.getState() == SoloAttemptState.COUNTDOWN) {
      if (now.isBefore(attempt.getStartedAt())) {
        throw new SoloAttemptNotActiveException("Attempt has not started yet");
      }
      attempt.activate();
      attempt = soloAttemptRepository.save(attempt);
      activeAttemptStateStore.register(attempt.getId(), attempt.getStartedAt());
    }

    if (attempt.getState() != SoloAttemptState.ACTIVE) {
      throw new SoloAttemptNotActiveException(
          "Attempt is not active (state=" + attempt.getState() + ")");
    }

    if (activeAttemptStateStore.get(attempt.getId()).isEmpty()) {
      attempt.invalidate();
      soloAttemptRepository.save(attempt);
      throw new SoloAttemptNotActiveException(
          "Live progress state unavailable; attempt invalidated");
    }

    int[] deltaCodePoints =
        CanonicalText.toCodePoints(CanonicalText.canonicalizeLineEndings(rawDelta));
    ActiveProgress progress =
        activeAttemptStateStore.applyDelta(
            attempt.getId(), sequence, deltaCodePoints, canonicalCodePoints, now);

    if (progress.acceptedOffset() < canonicalCodePoints.length) {
      return new ProgressResult(attempt, progress.acceptedOffset());
    }

    SoloAttemptResult result =
        resultCalculator.calculate(attempt.getStartedAt(), now, canonicalCodePoints.length);
    attempt.complete(now, result.durationMs(), result.cpm());
    attempt = soloAttemptRepository.save(attempt);
    activeAttemptStateStore.remove(attempt.getId());

    return new ProgressResult(attempt, canonicalCodePoints.length);
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
