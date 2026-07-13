package org.coderacer.backend.common.exception;

import java.util.List;
import org.coderacer.backend.common.error.FieldError;

// Exception thrown when validation fails.
public class ValidationException extends BaseException {
  private final List<FieldError> errors;

  public ValidationException(String message, List<FieldError> errors) {
    super(message, "VALIDATION_FAILED");
    this.errors = errors;
  }

  public List<FieldError> getErrors() {
    return errors;
  }
}
