package org.coderacer.backend.auth.exception;

import org.coderacer.backend.common.exception.BaseException;
import org.springframework.http.HttpStatus;

public class AuthenticationFailedException extends BaseException {

  public AuthenticationFailedException() {
    super("Invalid username or password", "INVALID_CREDENTIALS", HttpStatus.UNAUTHORIZED);
  }
}
