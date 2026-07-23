package org.coderacer.backend.exception;

import org.springframework.http.HttpStatus;

public class MissingCurrentUserException extends BaseException {
  public MissingCurrentUserException(String message) {
    super(message, "MISSING_CURRENT_USER", HttpStatus.BAD_REQUEST);
  }
}
