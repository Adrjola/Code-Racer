package org.coderacer.backend.common.exception;

// Exception thrown when a requested resource is not found.
public class ResourceNotFoundException extends BaseException {
  public ResourceNotFoundException(String message) {
    super(message, "RESOURCE_NOT_FOUND");
  }

  public ResourceNotFoundException(String message, String code) {
    super(message, code);
  }
}
