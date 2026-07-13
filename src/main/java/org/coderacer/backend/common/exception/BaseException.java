package org.coderacer.backend.common.exception;

// Base class for all domain-specific exceptions.
public abstract class BaseException extends RuntimeException {
  private final String code;

  protected BaseException(String message, String code) {
    super(message);
    this.code = code;
  }

  protected BaseException(String message, String code, Throwable cause) {
    super(message, cause);
    this.code = code;
  }

  public String getCode() {
    return code;
  }
}
