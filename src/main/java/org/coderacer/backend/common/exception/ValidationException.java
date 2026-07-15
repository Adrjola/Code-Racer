package org.coderacer.backend.common.exception;

import java.util.List;
import org.coderacer.backend.common.error.FieldError;
import org.springframework.http.HttpStatus;

// Exception thrown when validation fails.
public class ValidationException extends BaseException {
  private final List<FieldError> errors;

  public ValidationException(String message, List<FieldError> errors) {
    super(message, "VALIDATION_FAILED", HttpStatus.BAD_REQUEST);
    this.errors = errors;
  }

  public List<FieldError> getErrors() {
    return errors;
  }
}
