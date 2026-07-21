package org.coderacer.backend.dto;

public record ForgotPasswordResponse(String message) {
  public static ForgotPasswordResponse accepted() {
    return new ForgotPasswordResponse(
        "If an account with the provided email exists, a password reset email will be sent.");
  }
}
