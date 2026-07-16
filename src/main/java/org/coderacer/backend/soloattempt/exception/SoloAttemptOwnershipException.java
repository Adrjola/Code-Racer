package org.coderacer.backend.soloattempt.exception;

import org.coderacer.backend.common.exception.BaseException;
import org.springframework.http.HttpStatus;

public class SoloAttemptOwnershipException extends BaseException {
  public SoloAttemptOwnershipException(String message) {
    super(message, "SOLO_ATTEMPT_NOT_OWNED", HttpStatus.FORBIDDEN);
  }
}
