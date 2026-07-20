package org.coderacer.backend.exception;

import org.springframework.http.HttpStatus;

public class AuthenticationFailedException extends BaseException {

  public AuthenticationFailedException() {
    super("Invalid email, username, or password", "INVALID_CREDENTIALS", HttpStatus.UNAUTHORIZED);
  }
}
