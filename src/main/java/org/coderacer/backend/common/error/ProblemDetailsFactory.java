package org.coderacer.backend.common.error;

import java.util.List;
import java.util.UUID;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

@Component
public class ProblemDetailsFactory {

  public ProblemDetails create(
      HttpStatus status, String detail, String code, String instance, List<FieldError> errors) {
    return ProblemDetails.builder()
        .type("about:blank")
        .status(status.value())
        .title(status.getReasonPhrase())
        .detail(detail)
        .instance(instance)
        .code(code)
        .correlationId(correlationId())
        .errors(errors)
        .build();
  }

  private String correlationId() {
    String correlationId = MDC.get("correlationId");
    return correlationId == null ? UUID.randomUUID().toString() : correlationId;
  }
}
