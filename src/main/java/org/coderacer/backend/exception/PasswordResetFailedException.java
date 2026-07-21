package org.coderacer.backend.exception;

import org.springframework.http.HttpStatus;

public class PasswordResetFailedException extends BaseException {
  public PasswordResetFailedException() {
    super(
        "Password reset link is invalid or expired",
        "PASSWORD_RESET_FAILED",
        HttpStatus.BAD_REQUEST);
  }
}
