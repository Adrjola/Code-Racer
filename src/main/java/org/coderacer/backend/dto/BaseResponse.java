package org.coderacer.backend.dto;

import java.time.OffsetDateTime;

public record BaseResponse<T>(T data, OffsetDateTime timestamp, String correlationId) {
  public BaseResponse(T data, String correlationId) {
    this(data, OffsetDateTime.now(), correlationId);
  }
}
