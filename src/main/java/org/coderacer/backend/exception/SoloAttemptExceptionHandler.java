package org.coderacer.backend.exception;

import java.time.Instant;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class SoloAttemptExceptionHandler {

  public record ErrorResponse(
      String error, String message, Instant timestamp, List<String> fieldErrors) {}

  @ExceptionHandler(SoloAttemptNotFoundException.class)
  public ResponseEntity<ErrorResponse> handleNotFound(SoloAttemptNotFoundException e) {
    return build(HttpStatus.NOT_FOUND, "NOT_FOUND", e.getMessage());
  }

  @ExceptionHandler(SoloAttemptOwnershipException.class)
  public ResponseEntity<ErrorResponse> handleOwnership(SoloAttemptOwnershipException e) {
    return build(HttpStatus.FORBIDDEN, "FORBIDDEN", e.getMessage());
  }

  @ExceptionHandler({
    OneActiveAttemptConflictException.class,
    SoloAttemptNotActiveException.class,
    ProgressSequenceException.class
  })
  public ResponseEntity<ErrorResponse> handleConflict(RuntimeException e) {
    return build(HttpStatus.CONFLICT, "CONFLICT", e.getMessage());
  }

  @ExceptionHandler({
    ProgressMismatchException.class,
    ImplausibleRateException.class,
    MissingCurrentUserException.class
  })
  public ResponseEntity<ErrorResponse> handleBadRequest(RuntimeException e) {
    return build(HttpStatus.BAD_REQUEST, "BAD_REQUEST", e.getMessage());
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException e) {
    List<String> fieldErrors =
        e.getBindingResult().getFieldErrors().stream()
            .map(fe -> fe.getField() + ": " + fe.getDefaultMessage())
            .toList();
    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
        .body(new ErrorResponse("BAD_REQUEST", "Validation failed", Instant.now(), fieldErrors));
  }

  private ResponseEntity<ErrorResponse> build(HttpStatus status, String code, String message) {
    return ResponseEntity.status(status)
        .body(new ErrorResponse(code, message, Instant.now(), List.of()));
  }
}
