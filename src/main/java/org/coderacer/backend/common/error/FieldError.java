package org.coderacer.backend.common.error;

// Represents a field-level validation error.
public record FieldError(
    String field,
    String message,
    Object rejectedValue
) {}
