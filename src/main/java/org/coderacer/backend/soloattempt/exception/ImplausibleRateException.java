package org.coderacer.backend.soloattempt.exception;

import org.coderacer.backend.common.exception.BaseException;
import org.springframework.http.HttpStatus;

public class ImplausibleRateException extends BaseException {
  public ImplausibleRateException(String message) {
    super(message, "IMPLAUSIBLE_RATE", HttpStatus.BAD_REQUEST);
  }
}
