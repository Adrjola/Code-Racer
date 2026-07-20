package org.coderacer.backend.exception;

import org.springframework.http.HttpStatus;

public class ValidationException extends BaseException {

  public ValidationException(String message) {
    super(message, "VALIDATION_FAILED", HttpStatus.BAD_REQUEST);
  }
}
