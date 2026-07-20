package org.coderacer.backend.dto;

import org.springframework.http.HttpStatus;

public record ApiError(int status, String instance, String code, String message) {

  public static ApiError of(HttpStatus status, String instance, String code, String message) {
    return new ApiError(status.value(), instance, code, message);
  }
}
