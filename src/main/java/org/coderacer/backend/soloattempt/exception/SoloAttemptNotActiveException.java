package org.coderacer.backend.soloattempt.exception;

import org.coderacer.backend.common.exception.ConflictException;

public class SoloAttemptNotActiveException extends ConflictException {
  public SoloAttemptNotActiveException(String message) {
    super(message, "SOLO_ATTEMPT_NOT_ACTIVE");
  }
}
