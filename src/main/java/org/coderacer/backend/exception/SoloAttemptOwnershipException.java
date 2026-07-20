package org.coderacer.backend.exception;

import org.springframework.http.HttpStatus;

public class SoloAttemptOwnershipException extends BaseException {
  public SoloAttemptOwnershipException(String message) {
    super(message, "SOLO_ATTEMPT_NOT_OWNED", HttpStatus.FORBIDDEN);
  }
}
