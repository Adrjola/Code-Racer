package org.coderacer.backend.soloattempt.exception;

import org.coderacer.backend.common.exception.ConflictException;

public class ProgressSequenceException extends ConflictException {
  public ProgressSequenceException(String message) {
    super(message, "PROGRESS_SEQUENCE_CONFLICT");
  }
}
