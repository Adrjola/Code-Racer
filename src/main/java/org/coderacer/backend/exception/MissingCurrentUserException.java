package org.coderacer.backend.exception;

public class MissingCurrentUserException extends RuntimeException {
  public MissingCurrentUserException(String message) {
    super(message);
  }
}
