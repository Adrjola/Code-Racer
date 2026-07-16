package org.coderacer.backend.common.exception;

import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.coderacer.backend.common.error.FieldError;
import org.coderacer.backend.common.error.ProblemDetails;
import org.coderacer.backend.common.error.ProblemDetailsFactory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.data.core.PropertyReferenceException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindException;
import org.springframework.web.ErrorResponse;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

@ControllerAdvice
@RequiredArgsConstructor
public class GlobalExceptionHandler {

  private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

  private final ProblemDetailsFactory problemDetailsFactory;

  @ExceptionHandler(ResourceNotFoundException.class)
  public ResponseEntity<ProblemDetails> handleNotFound(
      ResourceNotFoundException ex, HttpServletRequest request) {
    return buildResponse(ex.getStatus(), ex.getMessage(), ex.getCode(), request, null);
  }

  @ExceptionHandler(ConflictException.class)
  public ResponseEntity<ProblemDetails> handleConflict(
      ConflictException ex, HttpServletRequest request) {
    return buildResponse(ex.getStatus(), ex.getMessage(), ex.getCode(), request, null);
  }

  @ExceptionHandler(ValidationException.class)
  public ResponseEntity<ProblemDetails> handleValidation(
      ValidationException ex, HttpServletRequest request) {
    return buildResponse(
        ex.getStatus(), "Validation failed", ex.getCode(), request, ex.getErrors());
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<ProblemDetails> handleMethodArgumentNotValid(
      MethodArgumentNotValidException ex, HttpServletRequest request) {
    List<FieldError> errors =
        ex.getBindingResult().getFieldErrors().stream()
            .map(e -> new FieldError(e.getField(), e.getDefaultMessage()))
            .toList();
    return buildResponse(
        HttpStatus.BAD_REQUEST, "Validation failed", "INVALID_INPUT", request, errors);
  }

  @ExceptionHandler(BindException.class)
  public ResponseEntity<ProblemDetails> handleBindException(
      BindException ex, HttpServletRequest request) {
    List<FieldError> errors =
        ex.getBindingResult().getFieldErrors().stream()
            .map(e -> new FieldError(e.getField(), e.getDefaultMessage()))
            .toList();
    return buildResponse(
        HttpStatus.BAD_REQUEST, "Validation failed", "INVALID_INPUT", request, errors);
  }

  @ExceptionHandler(MethodArgumentTypeMismatchException.class)
  public ResponseEntity<ProblemDetails> handleTypeMismatch(
      MethodArgumentTypeMismatchException ex, HttpServletRequest request) {
    return buildResponse(
        HttpStatus.BAD_REQUEST,
        "Validation failed",
        "INVALID_INPUT",
        request,
        List.of(new FieldError(ex.getName(), "has an invalid value")));
  }

  @ExceptionHandler(PropertyReferenceException.class)
  public ResponseEntity<ProblemDetails> handleUnknownProperty(
      PropertyReferenceException ex, HttpServletRequest request) {
    return buildResponse(
        HttpStatus.BAD_REQUEST,
        "Validation failed",
        "INVALID_INPUT",
        request,
        List.of(new FieldError(ex.getPropertyName(), "is not a sortable or filterable property")));
  }

  @ExceptionHandler(OptimisticLockingFailureException.class)
  public ResponseEntity<ProblemDetails> handleOptimisticLockingFailure(
      OptimisticLockingFailureException ex, HttpServletRequest request) {
    return buildResponse(
        HttpStatus.CONFLICT,
        "Resource was changed by someone else, reload it and try again",
        "VERSION_CONFLICT",
        request,
        null);
  }

  @ExceptionHandler(BaseException.class)
  public ResponseEntity<ProblemDetails> handleBaseException(
      BaseException ex, HttpServletRequest request) {
    log.error("Domain exception occurred: {}", ex.getMessage());
    return buildResponse(ex.getStatus(), ex.getMessage(), ex.getCode(), request, null);
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<ProblemDetails> handleGeneralException(
      Exception ex, HttpServletRequest request) {
    if (ex instanceof ErrorResponse errorResponse) {
      return buildResponse(
          HttpStatus.valueOf(errorResponse.getStatusCode().value()),
          errorResponse.getBody().getDetail(),
          "FRAMEWORK_ERROR",
          request,
          null);
    }

    log.error("Unhandled exception occurred", ex);
    return buildResponse(
        HttpStatus.INTERNAL_SERVER_ERROR,
        "An unexpected error occurred",
        "INTERNAL_SERVER_ERROR",
        request,
        null);
  }

  private ResponseEntity<ProblemDetails> buildResponse(
      HttpStatus status,
      String detail,
      String code,
      HttpServletRequest request,
      List<FieldError> errors) {
    ProblemDetails problem =
        problemDetailsFactory.create(status, detail, code, request.getRequestURI(), errors);

    return ResponseEntity.status(status).body(problem);
  }
}
