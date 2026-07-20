package org.coderacer.backend.exception;

import org.springframework.http.HttpStatus;

public class TooManyLoginAttemptsException extends BaseException {

  public TooManyLoginAttemptsException() {
    super(
        "Too many failed login attempts. Please try again later",
        "TOO_MANY_LOGIN_ATTEMPTS",
        HttpStatus.TOO_MANY_REQUESTS);
  }
}
