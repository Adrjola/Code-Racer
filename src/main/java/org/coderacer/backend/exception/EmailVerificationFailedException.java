package org.coderacer.backend.exception;

import org.springframework.http.HttpStatus;

public class EmailVerificationFailedException extends BaseException {

  public EmailVerificationFailedException() {
    super(
        "Email verification link is invalid or expired",
        "EMAIL_VERIFICATION_FAILED",
        HttpStatus.BAD_REQUEST);
  }
}
