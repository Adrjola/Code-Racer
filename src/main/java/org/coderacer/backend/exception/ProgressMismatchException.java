package org.coderacer.backend.exception;

import org.springframework.http.HttpStatus;

public class ProgressMismatchException extends BaseException {
  public ProgressMismatchException(String message) {
    super(message, "PROGRESS_MISMATCH", HttpStatus.BAD_REQUEST);
  }
}
