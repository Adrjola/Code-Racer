package org.coderacer.backend.exception;

public class SoloAttemptNotActiveException extends ConflictException {
  public SoloAttemptNotActiveException(String message) {
    super(message, "SOLO_ATTEMPT_NOT_ACTIVE");
  }
}
