package org.coderacer.backend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.coderacer.backend.dto.BaseResponse;
import org.coderacer.backend.dto.UserRegistrationRequest;
import org.coderacer.backend.dto.UserResponse;
import org.coderacer.backend.service.UserRegistrationService;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class UserRegistrationController {

  private final UserRegistrationService service;

  @PostMapping("/register")
  public ResponseEntity<BaseResponse<UserResponse>> register(
      @Valid @RequestBody UserRegistrationRequest request) {
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(new BaseResponse<>(service.register(request), MDC.get("correlationId")));
  }
}
