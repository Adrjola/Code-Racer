package org.coderacer.backend.exception;

public class IllegalSoloAttemptStateTransitionException extends IllegalStateException {
  public IllegalSoloAttemptStateTransitionException(String message) {
    super(message);
  }
}
