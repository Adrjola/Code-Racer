package org.coderacer.backend.exception;

public class SoloAttemptNotActiveException extends RuntimeException {
  public SoloAttemptNotActiveException(String message) {
    super(message);
  }
}
