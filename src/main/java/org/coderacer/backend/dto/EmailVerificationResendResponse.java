package org.coderacer.backend.dto;

public record EmailVerificationResendResponse(String message) {

  private static final String NEUTRAL_MESSAGE =
      "If an unverified account exists, a verification email will be sent.";

  public static EmailVerificationResendResponse accepted() {
    return new EmailVerificationResendResponse(NEUTRAL_MESSAGE);
  }
}
