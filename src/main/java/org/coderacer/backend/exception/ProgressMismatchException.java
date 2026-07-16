package org.coderacer.backend.exception;

public class ProgressMismatchException extends RuntimeException {
  public ProgressMismatchException(String message) {
    super(message);
  }
}
