package org.coderacer.backend.model;

public enum AttemptState {
    STARTED,
    COMPLETED,
    ABANDONED;

    public boolean canTransitionTo(AttemptState target) {
        return switch (this) {
            case STARTED -> target == COMPLETED || target == ABANDONED;
            case COMPLETED, ABANDONED -> false;
        };
    }
}
