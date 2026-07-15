package org.coderacer.backend.common.error;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.OffsetDateTime;
import java.util.List;
import org.junit.jupiter.api.Test;

class ProblemDetailsTest {

  @Test
  void shouldBuildProblemDetailsWithAllFields() {
    OffsetDateTime now = OffsetDateTime.now();
    List<FieldError> errors = List.of(new FieldError("field", "message"));

    ProblemDetails details =
        ProblemDetails.builder()
            .type("http://example.com")
            .title("Title")
            .status(400)
            .detail("Detail")
            .instance("/api/test")
            .code("TEST_CODE")
            .timestamp(now)
            .correlationId("corr-id")
            .errors(errors)
            .build();

    assertThat(details.type()).isEqualTo("http://example.com");
    assertThat(details.title()).isEqualTo("Title");
    assertThat(details.status()).isEqualTo(400);
    assertThat(details.detail()).isEqualTo("Detail");
    assertThat(details.instance()).isEqualTo("/api/test");
    assertThat(details.code()).isEqualTo("TEST_CODE");
    assertThat(details.timestamp()).isEqualTo(now);
    assertThat(details.correlationId()).isEqualTo("corr-id");
    assertThat(details.errors()).isEqualTo(errors);
  }

  @Test
  void shouldBuildWithDefaults() {
    ProblemDetails details = ProblemDetails.builder().status(200).build();

    assertThat(details.type()).isEqualTo("about:blank");
    assertThat(details.timestamp()).isNotNull();
    assertThat(details.status()).isEqualTo(200);
  }
}
