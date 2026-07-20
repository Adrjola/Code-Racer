package org.coderacer.backend.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import lombok.RequiredArgsConstructor;
import org.coderacer.backend.dto.ApiError;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

@Component
@RequiredArgsConstructor
public class SecurityExceptionHandler implements AuthenticationEntryPoint, AccessDeniedHandler {

  private final ObjectMapper objectMapper;

  @Override
  public void commence(
      HttpServletRequest request, HttpServletResponse response, AuthenticationException ex)
      throws IOException {
    writeProblem(
        response,
        HttpStatus.UNAUTHORIZED,
        "Authentication is required",
        "AUTHENTICATION_REQUIRED",
        request);
  }

  @Override
  public void handle(
      HttpServletRequest request, HttpServletResponse response, AccessDeniedException ex)
      throws IOException {
    writeProblem(
        response,
        HttpStatus.FORBIDDEN,
        "You do not have permission to access this resource",
        "ACCESS_DENIED",
        request);
  }

  private void writeProblem(
      HttpServletResponse response,
      HttpStatus status,
      String message,
      String code,
      HttpServletRequest request)
      throws IOException {
    ApiError error = ApiError.of(status, request.getRequestURI(), code, message);

    response.setStatus(status.value());
    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
    objectMapper.writeValue(response.getOutputStream(), error);
  }
}
