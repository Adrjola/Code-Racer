package org.coderacer.backend.exception;

import org.springframework.http.HttpStatus;

public class ImplausibleRateException extends BaseException {
  public ImplausibleRateException(String message) {
    super(message, "IMPLAUSIBLE_RATE", HttpStatus.BAD_REQUEST);
  }
}
