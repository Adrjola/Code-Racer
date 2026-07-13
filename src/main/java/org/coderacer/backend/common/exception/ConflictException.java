package org.coderacer.backend.common.exception;

// Exception thrown when a resource already exists or there is a conflict.
public class ConflictException extends BaseException {
  public ConflictException(String message) {
    super(message, "CONFLICT");
  }

  public ConflictException(String message, String code) {
    super(message, code);
  }
}
