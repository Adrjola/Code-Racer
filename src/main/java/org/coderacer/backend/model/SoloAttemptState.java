package org.coderacer.backend.model;

public enum SoloAttemptState {
  COUNTDOWN,
  ACTIVE,
  COMPLETED,
  ABANDONED,
  EXPIRED,
  INVALIDATED;

  public boolean canTransitionTo(SoloAttemptState target) {
    return switch (this) {
      case COUNTDOWN -> target == ACTIVE || target == ABANDONED;
      case ACTIVE ->
          target == COMPLETED || target == INVALIDATED || target == ABANDONED || target == EXPIRED;
      default -> false;
    };
  }
}
