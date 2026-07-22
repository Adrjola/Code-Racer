package org.coderacer.backend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.coderacer.backend.dto.BaseResponse;
import org.coderacer.backend.dto.ForgotPasswordRequest;
import org.coderacer.backend.dto.ForgotPasswordResponse;
import org.coderacer.backend.dto.ResetPasswordRequest;
import org.coderacer.backend.service.PasswordResetService;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class PasswordResetController {

  private final PasswordResetService passwordResetService;

  @PostMapping("/forgot-password")
  @ResponseStatus(HttpStatus.ACCEPTED)
  public BaseResponse<ForgotPasswordResponse> forgotPassword(
      @Valid @RequestBody ForgotPasswordRequest request) {
    return new BaseResponse<>(passwordResetService.requestReset(request), MDC.get("correlationId"));
  }

  @PostMapping("/reset-password")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
    passwordResetService.resetPassword(request);
  }
}
