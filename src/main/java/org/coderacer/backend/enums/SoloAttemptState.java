package org.coderacer.backend.enums;

import java.util.EnumSet;
import java.util.Set;

public enum SoloAttemptState {
  COUNTDOWN,
  ACTIVE,
  COMPLETED,
  ABANDONED,
  EXPIRED,
  INVALIDATED;

  private static final Set<SoloAttemptState> TERMINAL_STATES =
      EnumSet.of(COMPLETED, ABANDONED, EXPIRED, INVALIDATED);

  public static Set<SoloAttemptState> terminalStates() {
    return TERMINAL_STATES;
  }

  public boolean canTransitionTo(SoloAttemptState target) {
    return switch (this) {
      case COUNTDOWN -> target == ACTIVE || target == ABANDONED;
      case ACTIVE ->
          target == COMPLETED || target == INVALIDATED || target == ABANDONED || target == EXPIRED;
      default -> false;
    };
  }
}
