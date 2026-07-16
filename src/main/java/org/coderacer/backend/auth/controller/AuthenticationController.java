package org.coderacer.backend.auth.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.coderacer.backend.auth.dto.LoginRequest;
import org.coderacer.backend.auth.dto.LoginResponse;
import org.coderacer.backend.auth.exception.AuthenticationFailedException;
import org.coderacer.backend.auth.service.AuthenticationService;
import org.coderacer.backend.auth.service.LoginAttemptService;
import org.coderacer.backend.common.dto.BaseResponse;
import org.slf4j.MDC;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthenticationController {

  private final AuthenticationService service;
  private final LoginAttemptService loginAttemptService;

  @PostMapping("/login")
  public BaseResponse<LoginResponse> login(
      @Valid @RequestBody LoginRequest request, HttpServletRequest servletRequest) {
    String clientAddress = servletRequest.getRemoteAddr();
    loginAttemptService.assertAllowed(request.identifier(), clientAddress);
    try {
      LoginResponse response = service.login(request);
      loginAttemptService.recordSuccess(request.identifier(), clientAddress);
      return new BaseResponse<>(response, MDC.get("correlationId"));
    } catch (AuthenticationFailedException ex) {
      loginAttemptService.recordFailure(request.identifier(), clientAddress);
      throw ex;
    }
  }
}
