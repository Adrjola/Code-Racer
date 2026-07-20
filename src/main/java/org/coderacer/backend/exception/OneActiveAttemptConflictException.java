package org.coderacer.backend.exception;

public class OneActiveAttemptConflictException extends ConflictException {
  public OneActiveAttemptConflictException(String message) {
    super(message, "ONE_ACTIVE_ATTEMPT_ALLOWED");
  }
}
