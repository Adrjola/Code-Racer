package org.coderacer.backend.soloattempt.exception;

import org.coderacer.backend.common.exception.BaseException;
import org.springframework.http.HttpStatus;

public class ProgressMismatchException extends BaseException {
  public ProgressMismatchException(String message) {
    super(message, "PROGRESS_MISMATCH", HttpStatus.BAD_REQUEST);
  }
}
