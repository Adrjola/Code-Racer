package org.coderacer.backend.common.error;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;

class ProblemDetailsFactoryTest {

  private final ProblemDetailsFactory factory = new ProblemDetailsFactory();

  @Test
  void create_reusesCorrelationIdFromMdc() {
    MDC.put("correlationId", "corr-id");
    try {
      ProblemDetails problem =
          factory.create(
              HttpStatus.BAD_REQUEST,
              "Validation failed",
              "INVALID_INPUT",
              "/api/test",
              List.of(new FieldError("name", "must not be blank")));

      assertThat(problem.correlationId()).isEqualTo("corr-id");
      assertThat(problem.errors()).hasSize(1);
    } finally {
      MDC.clear();
    }
  }

  @Test
  void create_generatesCorrelationIdWhenMdcIsEmpty() {
    MDC.clear();

    ProblemDetails problem =
        factory.create(
            HttpStatus.UNAUTHORIZED, "Authentication is required", "AUTH", "/api/test", null);

    assertThat(problem.correlationId()).isNotBlank();
  }
}
