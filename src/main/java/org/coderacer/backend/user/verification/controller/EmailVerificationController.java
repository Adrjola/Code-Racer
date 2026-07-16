package org.coderacer.backend.user.verification.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.coderacer.backend.common.dto.BaseResponse;
import org.coderacer.backend.user.dto.UserResponse;
import org.coderacer.backend.user.verification.dto.EmailVerificationConfirmRequest;
import org.coderacer.backend.user.verification.dto.EmailVerificationResendRequest;
import org.coderacer.backend.user.verification.dto.EmailVerificationResendResponse;
import org.coderacer.backend.user.verification.service.EmailVerificationService;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth/email-verification")
@RequiredArgsConstructor
public class EmailVerificationController {

  private final EmailVerificationService service;

  @PostMapping("/confirm")
  public BaseResponse<UserResponse> confirm(
      @Valid @RequestBody EmailVerificationConfirmRequest request) {
    return new BaseResponse<>(service.confirm(request), MDC.get("correlationId"));
  }

  @PostMapping("/resend")
  public ResponseEntity<BaseResponse<EmailVerificationResendResponse>> resend(
      @Valid @RequestBody EmailVerificationResendRequest request) {
    return ResponseEntity.status(HttpStatus.ACCEPTED)
        .body(new BaseResponse<>(service.resend(request), MDC.get("correlationId")));
  }
}
