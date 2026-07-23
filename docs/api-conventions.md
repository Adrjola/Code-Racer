## API Conventions

This document outlines the shared HTTP, validation, exception handling, and logging conventions used in the Code Racer backend.

#### 1. Error Handling
All error responses use a small shared JSON shape. Keep it simple and stable so
frontend code, tests, and developers can read failures quickly.

**Structure:**
```json
{
  "status": 404,
  "instance": "/api/users/123",
  "code": "RESOURCE_NOT_FOUND",
  "message": "User with id 123 not found"
}
```
- `status`: The HTTP status code.
- `instance`: The request path where the error happened.
- `code`: A stable, machine-readable string (e.g., `INVALID_INPUT`, `ALREADY_EXISTS`, `FRAMEWORK_ERROR`).
- `message`: The human-readable error message.

#### 2. Exception Hierarchy
Do not catch broad exceptions in controllers. Instead, throw domain-specific exceptions:
- `ResourceNotFoundException`: Maps to `404 Not Found`.
- `ConflictException`: Maps to `409 Conflict`.
- `ValidationException`: Maps to `400 Bad Request` (for service-level rules).
- `BaseException`: Base for all custom exceptions.

The `GlobalExceptionHandler` centrally manages these and converts them into the
shared `ApiError` response format.

#### 3. Validation
- **Request Boundary**: Use Jakarta Bean Validation annotations (`@NotNull`, `@NotBlank`, `@Size`, etc.) in DTOs.
- **Trigger**: Annotate controller parameters with `@Valid`.
- **Response**: Validation failures automatically return a `400 Bad Request`
  with `code: "INVALID_INPUT"` and a readable `message`.

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
  Login accepts `identifier` and `password`; `identifier` can be either a username
  or an email address. Failed login attempts are throttled per identifier and
  client address. Deployments should still add edge or gateway rate limiting for
  distributed brute-force protection.
- **Email verification**: New registrations create unverified USER accounts and
  send a verification email. Verification links contain a high-entropy, expiring,
  single-use token; only the token hash is stored server-side. Confirmation and
  resend routes are public under `/api/auth/email-verification`. Resend responses
  are neutral and must not reveal whether an email address belongs to an account.
- **JWTs**: Access tokens are short-lived bearer tokens. Raw tokens, passwords,
  and password hashes must never be logged or returned outside the login
  response. Password reset and password change flows must invalidate existing
  tokens by updating the user's token-valid-from timestamp.
- **Authorization**: `/api/admin/**` requires the `ADMIN` role. General
  authenticated API routes require `USER` or `ADMIN` unless explicitly marked
  public.
- **AI Explanation**: `GET /api/admin/snippets/{id}/explanation` returns a
  structured AI-generated explanation for an active snippet. Requires the `ADMIN`
  role. The response DTO contains `summary`, `stepByStep`, `concepts`, and
  `bestPractices` fields. Provider errors are mapped to safe HTTP statuses
  (503 disabled/unavailable, 504 timeout, 502 invalid response) without leaking
  provider internals.
- **Actuator**: Only `health` and `info` endpoints are exposed by default.

#### 7. Testing
- Use `MockMvc` for testing API behavior, including error cases and CORS.
- Maintain at least **80% code coverage** for all new functionality.
