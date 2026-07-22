package org.coderacer.backend.service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import org.coderacer.backend.enums.SoloAttemptState;
import org.coderacer.backend.model.SoloAttempt;
import org.coderacer.backend.repository.SoloAttemptRepository;
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
    // Progress rides along on the row the sweep already loaded, so no per-attempt lookup.
    Instant lastProgressAt = attempt.getLastProgressAt();
    if (lastProgressAt == null) {
      attempt.invalidate();
      soloAttemptRepository.save(attempt);
      return;
    }

    boolean idleTooLong = Duration.between(lastProgressAt, now).compareTo(IDLE_TTL) > 0;
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
