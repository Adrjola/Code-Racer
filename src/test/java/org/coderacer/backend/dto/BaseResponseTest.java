package org.coderacer.backend.dto;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.OffsetDateTime;
import org.junit.jupiter.api.Test;

class BaseResponseTest {

  @Test
  void shouldCreateBaseResponseWithDataAndCorrelationId() {
    String data = "test-data";
    String correlationId = "test-id";

    BaseResponse<String> response = new BaseResponse<>(data, correlationId);

    assertThat(response.data()).isEqualTo(data);
    assertThat(response.correlationId()).isEqualTo(correlationId);
    assertThat(response.timestamp()).isBeforeOrEqualTo(OffsetDateTime.now());
  }

  @Test
  void shouldCreateBaseResponseWithAllFields() {
    String data = "test-data";
    String correlationId = "test-id";
    OffsetDateTime now = OffsetDateTime.now();

    BaseResponse<String> response = new BaseResponse<>(data, now, correlationId);

    assertThat(response.data()).isEqualTo(data);
    assertThat(response.timestamp()).isEqualTo(now);
    assertThat(response.correlationId()).isEqualTo(correlationId);
  }
}
