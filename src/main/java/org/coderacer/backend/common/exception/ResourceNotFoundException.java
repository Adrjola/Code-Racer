package org.coderacer.backend.common.exception;

import org.springframework.http.HttpStatus;

// Exception thrown when a requested resource is not found.
public class ResourceNotFoundException extends BaseException {
  public ResourceNotFoundException(String message) {
    super(message, "RESOURCE_NOT_FOUND", HttpStatus.NOT_FOUND);
  }

  public ResourceNotFoundException(String message, String code) {
    super(message, code, HttpStatus.NOT_FOUND);
  }
}
