package org.coderacer.backend.exception;

public class ProgressSequenceException extends ConflictException {
  public ProgressSequenceException(String message) {
    super(message, "PROGRESS_SEQUENCE_CONFLICT");
  }
}
