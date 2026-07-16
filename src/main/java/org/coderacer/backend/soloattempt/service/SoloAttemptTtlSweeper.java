package org.coderacer.backend.soloattempt.service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.coderacer.backend.soloattempt.model.SoloAttempt;
import org.coderacer.backend.soloattempt.model.SoloAttemptState;
import org.coderacer.backend.soloattempt.progress.ActiveAttemptStateStore;
import org.coderacer.backend.soloattempt.progress.ActiveProgress;
import org.coderacer.backend.soloattempt.repository.SoloAttemptRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class SoloAttemptTtlSweeper {

  private static final Duration IDLE_TTL = Duration.ofSeconds(60);
  private static final Duration MAX_ATTEMPT_DURATION = Duration.ofMinutes(30);

  private final SoloAttemptRepository soloAttemptRepository;
  private final ActiveAttemptStateStore activeAttemptStateStore;
  private final Clock clock;

  public SoloAttemptTtlSweeper(
      SoloAttemptRepository soloAttemptRepository,
      ActiveAttemptStateStore activeAttemptStateStore,
      Clock clock) {
    this.soloAttemptRepository = soloAttemptRepository;
    this.activeAttemptStateStore = activeAttemptStateStore;
    this.clock = clock;
  }

  @Scheduled(fixedDelay = 30000)
  @Transactional
  public void sweep() {
    Instant now = clock.instant();
    List<SoloAttempt> live =
        soloAttemptRepository.findByStateIn(
            List.of(SoloAttemptState.COUNTDOWN, SoloAttemptState.ACTIVE));

    live.forEach(
        soloAttempt -> {
          if ((soloAttempt.getState() == SoloAttemptState.ACTIVE)) {
            sweepActive(soloAttempt, now);
          } else {
            sweepCountdown(soloAttempt, now);
          }
        });
  }

  private void sweepActive(SoloAttempt attempt, Instant now) {
    Optional<ActiveProgress> progress = activeAttemptStateStore.get(attempt.getId());
    if (progress.isEmpty()) {
      attempt.invalidate();
      soloAttemptRepository.save(attempt);
      return;
    }

    boolean idleTooLong =
        Duration.between(progress.get().lastActivityAt(), now).compareTo(IDLE_TTL) > 0;
    boolean tooLongOverall =
        Duration.between(attempt.getStartedAt(), now).compareTo(MAX_ATTEMPT_DURATION) > 0;
    if (idleTooLong || tooLongOverall) {
      attempt.expire();
      soloAttemptRepository.save(attempt);
      activeAttemptStateStore.remove(attempt.getId());
    }
  }

  private void sweepCountdown(SoloAttempt attempt, Instant now) {
    boolean tooLongOverall =
        Duration.between(attempt.getStartedAt(), now).compareTo(MAX_ATTEMPT_DURATION) > 0;
    if (tooLongOverall) {
      attempt.activate();
      attempt.expire();
      soloAttemptRepository.save(attempt);
    }
  }
}
