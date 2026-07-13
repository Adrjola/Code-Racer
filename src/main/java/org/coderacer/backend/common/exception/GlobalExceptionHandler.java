package org.coderacer.backend.common.exception;

import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.UUID;
import org.coderacer.backend.common.error.FieldError;
import org.coderacer.backend.common.error.ProblemDetails;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

@ControllerAdvice
public class GlobalExceptionHandler {

  private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

  @ExceptionHandler(ResourceNotFoundException.class)
  public ResponseEntity<ProblemDetails> handleNotFound(
      ResourceNotFoundException ex, HttpServletRequest request) {
    return buildResponse(HttpStatus.NOT_FOUND, ex.getMessage(), ex.getCode(), request, null);
  }

  @ExceptionHandler(ConflictException.class)
  public ResponseEntity<ProblemDetails> handleConflict(
      ConflictException ex, HttpServletRequest request) {
    return buildResponse(HttpStatus.CONFLICT, ex.getMessage(), ex.getCode(), request, null);
  }

  @ExceptionHandler(ValidationException.class)
  public ResponseEntity<ProblemDetails> handleValidation(
      ValidationException ex, HttpServletRequest request) {
    return buildResponse(
        HttpStatus.BAD_REQUEST, "Validation failed", ex.getCode(), request, ex.getErrors());
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<ProblemDetails> handleMethodArgumentNotValid(
      MethodArgumentNotValidException ex, HttpServletRequest request) {
    List<FieldError> errors =
        ex.getBindingResult().getFieldErrors().stream()
            .map(e -> new FieldError(e.getField(), e.getDefaultMessage(), e.getRejectedValue()))
            .toList();
    return buildResponse(
        HttpStatus.BAD_REQUEST, "Validation failed", "INVALID_INPUT", request, errors);
  }

  @ExceptionHandler(BindException.class)
  public ResponseEntity<ProblemDetails> handleBindException(
      BindException ex, HttpServletRequest request) {
    List<FieldError> errors =
        ex.getBindingResult().getFieldErrors().stream()
            .map(e -> new FieldError(e.getField(), e.getDefaultMessage(), e.getRejectedValue()))
            .toList();
    return buildResponse(
        HttpStatus.BAD_REQUEST, "Validation failed", "INVALID_INPUT", request, errors);
  }

  @ExceptionHandler(BaseException.class)
  public ResponseEntity<ProblemDetails> handleBaseException(
      BaseException ex, HttpServletRequest request) {
    log.error("Domain exception occurred: {}", ex.getMessage());
    return buildResponse(
        HttpStatus.INTERNAL_SERVER_ERROR, ex.getMessage(), ex.getCode(), request, null);
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<ProblemDetails> handleGeneralException(
      Exception ex, HttpServletRequest request) {
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
    String correlationId = MDC.get("correlationId");
    if (correlationId == null) {
      correlationId = UUID.randomUUID().toString();
    }

    ProblemDetails problem =
        ProblemDetails.builder()
            .status(status.value())
            .title(status.getReasonPhrase())
            .detail(detail)
            .instance(request.getRequestURI())
            .code(code)
            .correlationId(correlationId)
            .errors(errors)
            .build();

    return ResponseEntity.status(status).body(problem);
  }
}
