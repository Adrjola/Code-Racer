package org.coderacer.backend.exception;

import org.springframework.http.HttpStatus;

public class AiProviderException extends BaseException {

  public AiProviderException(String message, String code, HttpStatus status) {
    super(message, code, status);
  }

  public AiProviderException(String message, String code, HttpStatus status, Throwable cause) {
    super(message, code, status, cause);
  }

  public static AiProviderException disabled() {
    return new AiProviderException(
        "AI explanation is currently disabled",
        "AI_PROVIDER_DISABLED",
        HttpStatus.SERVICE_UNAVAILABLE);
  }

  public static AiProviderException timeout(Throwable cause) {
    return new AiProviderException(
        "AI provider did not respond in time",
        "AI_PROVIDER_TIMEOUT",
        HttpStatus.GATEWAY_TIMEOUT,
        cause);
  }

  public static AiProviderException unavailable(Throwable cause) {
    return new AiProviderException(
        "AI provider is currently unavailable",
        "AI_PROVIDER_UNAVAILABLE",
        HttpStatus.SERVICE_UNAVAILABLE,
        cause);
  }

  public static AiProviderException invalidResponse(String detail) {
    return new AiProviderException(
        "AI provider returned an invalid response: " + detail,
        "AI_PROVIDER_INVALID_RESPONSE",
        HttpStatus.BAD_GATEWAY);
  }
}
