package org.coderacer.backend.soloattempt.exception;

import org.coderacer.backend.common.exception.BaseException;
import org.springframework.http.HttpStatus;

public class MissingCurrentUserException extends BaseException {
  public MissingCurrentUserException(String message) {
    super(message, "MISSING_CURRENT_USER", HttpStatus.BAD_REQUEST);
  }
}
