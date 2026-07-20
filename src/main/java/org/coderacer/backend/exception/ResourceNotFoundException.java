package org.coderacer.backend.exception;

import org.springframework.http.HttpStatus;

public class ResourceNotFoundException extends BaseException {
  public ResourceNotFoundException(String message) {
    super(message, "RESOURCE_NOT_FOUND", HttpStatus.NOT_FOUND);
  }

  public ResourceNotFoundException(String message, String code) {
    super(message, code, HttpStatus.NOT_FOUND);
  }
}
