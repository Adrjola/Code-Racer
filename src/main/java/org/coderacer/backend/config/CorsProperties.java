package org.coderacer.backend.config;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "app.cors")
public record CorsProperties(@NotEmpty List<@NotBlank String> allowedOrigins) {
  public CorsProperties {
    if (allowedOrigins != null) {
      allowedOrigins =
          allowedOrigins.stream().map(origin -> origin == null ? null : origin.trim()).toList();
    }
  }

  @AssertTrue(message = "Wildcard CORS origins are not allowed when credentials are enabled")
  public boolean isWildcardOriginDisabled() {
    return allowedOrigins == null || allowedOrigins.stream().noneMatch("*"::equals);
  }
}
