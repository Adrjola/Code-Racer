package org.coderacer.backend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.coderacer.backend.dto.BaseResponse;
import org.coderacer.backend.dto.EmailVerificationConfirmRequest;
import org.coderacer.backend.dto.EmailVerificationResendRequest;
import org.coderacer.backend.dto.EmailVerificationResendResponse;
import org.coderacer.backend.dto.UserResponse;
import org.coderacer.backend.service.EmailVerificationService;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth/email-verification")
@RequiredArgsConstructor
public class EmailVerificationController {

  private final EmailVerificationService service;

  @PostMapping("/confirm")
  public BaseResponse<UserResponse> confirm(
      @Valid @RequestBody EmailVerificationConfirmRequest request) {
    return wrap(service.confirm(request));
  }

  @PostMapping("/resend")
  @ResponseStatus(HttpStatus.ACCEPTED)
  public BaseResponse<EmailVerificationResendResponse> resend(
      @Valid @RequestBody EmailVerificationResendRequest request) {
    return wrap(service.resend(request));
  }

  private <T> BaseResponse<T> wrap(T data) {
    return new BaseResponse<>(data, MDC.get("correlationId"));
  }
}
