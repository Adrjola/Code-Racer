package org.coderacer.backend.config.properties;

import jakarta.validation.constraints.NotBlank;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "app.ai")
public record AiProviderProperties(
    boolean enabled, String apiKey, @NotBlank String baseUrl, @NotBlank String modelId) {

  public static final int CONNECT_TIMEOUT_SECONDS = 5;
  public static final int READ_TIMEOUT_SECONDS = 30;
  public static final int TOKEN_BUDGET = 4096;
}
