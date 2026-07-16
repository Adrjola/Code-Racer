package org.coderacer.backend.common.exception;

import jakarta.servlet.http.HttpServletRequest;
import java.util.stream.Collectors;
import org.coderacer.backend.common.error.ApiError;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindException;
import org.springframework.validation.BindingResult;
import org.springframework.web.ErrorResponse;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

@ControllerAdvice
public class GlobalExceptionHandler {

  private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

  @ExceptionHandler(ResourceNotFoundException.class)
  public ResponseEntity<ApiError> handleNotFound(
      ResourceNotFoundException ex, HttpServletRequest request) {
    return buildResponse(ex.getStatus(), ex.getMessage(), ex.getCode(), request);
  }

  @ExceptionHandler(ConflictException.class)
  public ResponseEntity<ApiError> handleConflict(ConflictException ex, HttpServletRequest request) {
    return buildResponse(ex.getStatus(), ex.getMessage(), ex.getCode(), request);
  }

  @ExceptionHandler(ValidationException.class)
  public ResponseEntity<ApiError> handleValidation(
      ValidationException ex, HttpServletRequest request) {
    return buildResponse(ex.getStatus(), ex.getMessage(), ex.getCode(), request);
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<ApiError> handleMethodArgumentNotValid(
      MethodArgumentNotValidException ex, HttpServletRequest request) {
    return buildResponse(
        HttpStatus.BAD_REQUEST, validationMessage(ex.getBindingResult()), "INVALID_INPUT", request);
  }

  @ExceptionHandler(BindException.class)
  public ResponseEntity<ApiError> handleBindException(
      BindException ex, HttpServletRequest request) {
    return buildResponse(
        HttpStatus.BAD_REQUEST, validationMessage(ex.getBindingResult()), "INVALID_INPUT", request);
  }

  @ExceptionHandler(OptimisticLockingFailureException.class)
  public ResponseEntity<ApiError> handleOptimisticLockingFailure(
      OptimisticLockingFailureException ex, HttpServletRequest request) {
    return buildResponse(
        HttpStatus.CONFLICT,
        "Resource was changed by someone else, reload it and try again",
        "VERSION_CONFLICT",
        request);
  }

  @ExceptionHandler(BaseException.class)
  public ResponseEntity<ApiError> handleBaseException(
      BaseException ex, HttpServletRequest request) {
    return buildResponse(ex.getStatus(), ex.getMessage(), ex.getCode(), request);
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<ApiError> handleGeneralException(Exception ex, HttpServletRequest request) {
    if (ex instanceof ErrorResponse errorResponse) {
      HttpStatus status = HttpStatus.valueOf(errorResponse.getStatusCode().value());
      return buildResponse(status, status.getReasonPhrase(), "FRAMEWORK_ERROR", request);
    }

    log.error("Unhandled exception occurred", ex);
    return buildResponse(
        HttpStatus.INTERNAL_SERVER_ERROR,
        "An unexpected error occurred",
        "INTERNAL_SERVER_ERROR",
        request);
  }

  private ResponseEntity<ApiError> buildResponse(
      HttpStatus status, String message, String code, HttpServletRequest request) {
    ApiError error = ApiError.of(status, request.getRequestURI(), code, message);

    return ResponseEntity.status(status).body(error);
  }

  private String validationMessage(BindingResult bindingResult) {
    String fields =
        bindingResult.getFieldErrors().stream()
            .map(error -> error.getField() + " " + error.getDefaultMessage())
            .distinct()
            .collect(Collectors.joining("; "));

    return fields.isBlank() ? "Validation failed" : "Validation failed: " + fields;
  }
}
