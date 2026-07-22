package org.coderacer.backend.config.properties;

import jakarta.validation.constraints.NotBlank;
import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "app.ai")
public record AiProviderProperties(
    boolean enabled,
    String apiKey,
    @NotBlank String baseUrl,
    @NotBlank String modelId,
    Duration connectTimeout,
    Duration readTimeout,
    int tokenBudget) {

  private static final int DEFAULT_TOKEN_BUDGET = 4096;

  public AiProviderProperties {
    if (connectTimeout == null) {
      connectTimeout = Duration.ofSeconds(5);
    }
    if (readTimeout == null) {
      readTimeout = Duration.ofSeconds(30);
    }
    if (tokenBudget <= 0) {
      tokenBudget = DEFAULT_TOKEN_BUDGET;
    }
  }
}
