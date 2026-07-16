package org.coderacer.backend.soloattempt.exception;

import org.coderacer.backend.common.exception.ConflictException;

public class OneActiveAttemptConflictException extends ConflictException {
  public OneActiveAttemptConflictException(String message) {
    super(message, "ONE_ACTIVE_ATTEMPT_ALLOWED");
  }
}
