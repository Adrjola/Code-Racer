package org.coderacer.backend.common.exception;

import org.springframework.http.HttpStatus;

// Exception thrown when a resource already exists or there is a conflict.
public class ConflictException extends BaseException {
  public ConflictException(String message) {
    super(message, "CONFLICT", HttpStatus.CONFLICT);
  }

  public ConflictException(String message, String code) {
    super(message, code, HttpStatus.CONFLICT);
  }
}
