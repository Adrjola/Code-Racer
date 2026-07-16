package org.coderacer.backend.exception;

public class OneActiveAttemptConflictException extends RuntimeException {
  public OneActiveAttemptConflictException(String message) {
    super(message);
  }
}
