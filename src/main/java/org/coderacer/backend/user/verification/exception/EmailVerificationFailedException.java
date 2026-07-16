package org.coderacer.backend.user.verification.exception;

import org.coderacer.backend.common.exception.BaseException;
import org.springframework.http.HttpStatus;

public class EmailVerificationFailedException extends BaseException {

  public EmailVerificationFailedException() {
    super(
        "Email verification link is invalid or expired",
        "EMAIL_VERIFICATION_FAILED",
        HttpStatus.BAD_REQUEST);
  }
}
