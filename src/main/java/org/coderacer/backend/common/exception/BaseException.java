package org.coderacer.backend.common.exception;

import org.springframework.http.HttpStatus;

// Base class for all domain-specific exceptions.
public abstract class BaseException extends RuntimeException {
  private final String code;
  private final HttpStatus status;

  protected BaseException(String message, String code) {
    this(message, code, HttpStatus.INTERNAL_SERVER_ERROR);
  }

  protected BaseException(String message, String code, HttpStatus status) {
    super(message);
    this.code = code;
    this.status = status;
  }

  protected BaseException(String message, String code, HttpStatus status, Throwable cause) {
    super(message, cause);
    this.code = code;
    this.status = status;
  }

  public String getCode() {
    return code;
  }

  public HttpStatus getStatus() {
    return status;
  }
}
