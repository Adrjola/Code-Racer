package org.coderacer.backend.service;

import java.time.Clock;
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

  private final SoloAttemptRepository soloAttemptRepository;
  private final ActiveAttemptStateStore activeAttemptStateStore;
  private final SoloAttemptStaleness staleness;
  private final Clock clock;

  public SoloAttemptTtlSweeper(
      SoloAttemptRepository soloAttemptRepository,
      ActiveAttemptStateStore activeAttemptStateStore,
      SoloAttemptStaleness staleness,
      Clock clock) {
    this.soloAttemptRepository = soloAttemptRepository;
    this.activeAttemptStateStore = activeAttemptStateStore;
    this.staleness = staleness;
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
    if (attempt.getLastProgressAt() == null) {
      attempt.invalidate();
      soloAttemptRepository.save(attempt);
      return;
    }

    if (staleness.isStale(attempt, now)) {
      attempt.expire();
      soloAttemptRepository.save(attempt);
      activeAttemptStateStore.remove(attempt.getId());
    }
  }

  private void sweepCountdown(SoloAttempt attempt, Instant now) {
    if (staleness.isStale(attempt, now)) {
      attempt.activate();
      attempt.expire();
      soloAttemptRepository.save(attempt);
    }
  }
}
