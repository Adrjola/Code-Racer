package org.coderacer.backend.soloattempt.service;

import java.time.Instant;
import java.util.UUID;
import org.coderacer.backend.soloattempt.exception.SoloAttemptNotFoundException;
import org.coderacer.backend.soloattempt.model.SoloAttempt;
import org.coderacer.backend.soloattempt.model.SoloAttemptState;
import org.coderacer.backend.soloattempt.repository.SoloAttemptRepository;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Component
public class SoloAttemptLifecycleWriter {

  private final SoloAttemptRepository repository;

  public SoloAttemptLifecycleWriter(SoloAttemptRepository repository) {
    this.repository = repository;
  }

  @Transactional(propagation = Propagation.REQUIRES_NEW)
  public SoloAttempt activate(UUID attemptId) {
    SoloAttempt attempt =
        repository
            .findById(attemptId)
            .orElseThrow(() -> new SoloAttemptNotFoundException(attemptId));
    if (attempt.getState() == SoloAttemptState.COUNTDOWN) {
      attempt.activate();
      attempt = repository.saveAndFlush(attempt);
    }
    return attempt;
  }

  @Transactional(propagation = Propagation.REQUIRES_NEW)
  public void invalidate(UUID attemptId) {
    repository
        .findById(attemptId)
        .filter(
            attempt ->
                attempt.getState() == SoloAttemptState.ACTIVE
                    || attempt.getState() == SoloAttemptState.COUNTDOWN)
        .ifPresent(
            attempt -> {
              attempt.invalidate();
              repository.saveAndFlush(attempt);
            });
  }

  @Transactional(propagation = Propagation.REQUIRES_NEW)
  public SoloAttempt tryComplete(UUID attemptId, Instant finishedAt, long durationMs, int cpm) {
    SoloAttempt attempt =
        repository
            .findById(attemptId)
            .orElseThrow(() -> new SoloAttemptNotFoundException(attemptId));
    attempt.complete(finishedAt, durationMs, cpm);
    return repository.saveAndFlush(attempt);
  }
}
