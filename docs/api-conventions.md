## API Conventions

This document outlines the shared HTTP, validation, exception handling, and logging conventions used in the Code Racer backend.

#### 1. Error Handling (RFC 9457)
All error responses follow the **RFC 9457 (Problem Details for HTTP APIs)** standard. This ensures a consistent error structure across the entire API.

**Structure:**
```json
{
  "type": "about:blank",
  "title": "Not Found",
  "status": 404,
  "detail": "User with id 123 not found",
  "instance": "/api/users/123",
  "code": "RESOURCE_NOT_FOUND",
  "timestamp": "2026-07-13T12:00:00Z",
  "correlationId": "550e8400-e29b-41d4-a716-446655440000",
  "errors": []
}
```
- `code`: A stable, machine-readable string (e.g., `INVALID_INPUT`, `ALREADY_EXISTS`, `FRAMEWORK_ERROR`).
- `correlationId`: A unique ID for tracing the request in logs.
- `errors`: A list of field-specific validation errors (optional, containing `field` and `message`).

#### 2. Exception Hierarchy
Do not catch broad exceptions in controllers. Instead, throw domain-specific exceptions:
- `ResourceNotFoundException`: Maps to `404 Not Found`.
- `ConflictException`: Maps to `409 Conflict`.
- `ValidationException`: Maps to `400 Bad Request` (for service-level rules).
- `BaseException`: Base for all custom exceptions.

The `GlobalExceptionHandler` centrally manages these and converts them into the `ProblemDetails` format.

#### 3. Validation
- **Request Boundary**: Use Jakarta Bean Validation annotations (`@NotNull`, `@NotBlank`, `@Size`, etc.) in DTOs.
- **Trigger**: Annotate controller parameters with `@Valid`.
- **Response**: Validation failures automatically return a `400 Bad Request` with a collection of field errors in the `errors` array.

#### 4. DTO & Response Wrapping
- **Separation**: Never serialize JPA entities directly. Use Request DTOs for input and Response DTOs for output.
- **Success Wrapper**: Use `BaseResponse<T>` to wrap successful data responses.
  ```java
  return ResponseEntity.ok(new BaseResponse<>(userData, correlationId));
  ```

#### 5. Logging & Traceability
- **Correlation ID**: Every request is assigned an `X-Correlation-ID`.
- **MDC**: This ID is stored in SLF4J MDC and included in the console log pattern.
- **Security**: Never log sensitive data (passwords, tokens).

#### 6. CORS & Security
- **CORS**: Configured via `app.cors.allowed-origins`, with the `ALLOWED_ORIGINS`
  environment variable available for deployment overrides. Origins must be
  explicit; wildcard origins are rejected while credentials are enabled.
- **Authentication**: Public authentication routes live under `/api/auth`.
  Login accepts `username` and `password`; email is not a login identifier.
  Failed login attempts are throttled per username and client address. Deployments
  should still add edge or gateway rate limiting for distributed brute-force
  protection.
- **JWTs**: Access tokens are short-lived bearer tokens. Raw tokens, passwords,
  and password hashes must never be logged or returned outside the login
  response. Password reset and password change flows must invalidate existing
  tokens by updating the user's token-valid-from timestamp.
- **Authorization**: `/api/admin/**` requires the `ADMIN` role. General
  authenticated API routes require `USER` or `ADMIN` unless explicitly marked
  public.
- **Actuator**: Only `health` and `info` endpoints are exposed by default.

#### 7. Testing
- Use `MockMvc` for testing API behavior, including error cases and CORS.
- Maintain at least **80% code coverage** for all new functionality.
