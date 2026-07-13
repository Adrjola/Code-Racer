package org.coderacer.backend.common.dto;

import java.time.OffsetDateTime;

// Base record for response DTOs to include common metadata if needed.
public record BaseResponse<T>(T data, OffsetDateTime timestamp, String correlationId) {
  public BaseResponse(T data, String correlationId) {
    this(data, OffsetDateTime.now(), correlationId);
  }
}
