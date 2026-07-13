package org.coderacer.backend.common.error;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.OffsetDateTime;
import java.util.List;

// RFC 9457 compliant problem details for HTTP APIs.
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ProblemDetails(
    String type,
    String title,
    int status,
    String detail,
    String instance,
    String code,
    OffsetDateTime timestamp,
    String correlationId,
    List<FieldError> errors) {
  public static ProblemDetailsBuilder builder() {
    return new ProblemDetailsBuilder();
  }

  public static final class ProblemDetailsBuilder {
    private String type;
    private String title;
    private int status;
    private String detail;
    private String instance;
    private String code;
    private OffsetDateTime timestamp = OffsetDateTime.now();
    private String correlationId;
    private List<FieldError> errors;

    public ProblemDetailsBuilder type(String type) {
      this.type = type;
      return this;
    }

    public ProblemDetailsBuilder title(String title) {
      this.title = title;
      return this;
    }

    public ProblemDetailsBuilder status(int status) {
      this.status = status;
      return this;
    }

    public ProblemDetailsBuilder detail(String detail) {
      this.detail = detail;
      return this;
    }

    public ProblemDetailsBuilder instance(String instance) {
      this.instance = instance;
      return this;
    }

    public ProblemDetailsBuilder code(String code) {
      this.code = code;
      return this;
    }

    public ProblemDetailsBuilder timestamp(OffsetDateTime timestamp) {
      this.timestamp = timestamp;
      return this;
    }

    public ProblemDetailsBuilder correlationId(String correlationId) {
      this.correlationId = correlationId;
      return this;
    }

    public ProblemDetailsBuilder errors(List<FieldError> errors) {
      this.errors = errors;
      return this;
    }

    public ProblemDetails build() {
      return new ProblemDetails(
          type, title, status, detail, instance, code, timestamp, correlationId, errors);
    }
  }
}
