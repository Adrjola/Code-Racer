package org.coderacer.backend.exception;

import org.springframework.http.HttpStatus;

public class ConflictException extends BaseException {
  public ConflictException(String message) {
    super(message, "CONFLICT", HttpStatus.CONFLICT);
  }

  public ConflictException(String message, String code) {
    super(message, code, HttpStatus.CONFLICT);
  }
}
