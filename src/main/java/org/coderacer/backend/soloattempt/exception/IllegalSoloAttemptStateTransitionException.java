package org.coderacer.backend.soloattempt.exception;

public class IllegalSoloAttemptStateTransitionException extends IllegalStateException {
  public IllegalSoloAttemptStateTransitionException(String message) {
    super(message);
  }
}
