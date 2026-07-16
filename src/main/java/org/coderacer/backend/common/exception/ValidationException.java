package org.coderacer.backend.common.exception;

import org.springframework.http.HttpStatus;

// Exception thrown when validation fails.
public class ValidationException extends BaseException {

  public ValidationException(String message) {
    super(message, "VALIDATION_FAILED", HttpStatus.BAD_REQUEST);
  }
}
