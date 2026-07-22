package org.coderacer.backend.config;

import org.coderacer.backend.config.properties.AiProviderProperties;
import org.coderacer.backend.service.AiProvider;
import org.coderacer.backend.service.GroqAiAdapter;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import tools.jackson.databind.ObjectMapper;

@Configuration
public class AiProviderConfig {

  @Bean
  @ConditionalOnProperty(name = "app.ai.enabled", havingValue = "true")
  public AiProvider aiProvider(AiProviderProperties properties, ObjectMapper objectMapper) {
    if (properties.apiKey() == null || properties.apiKey().isBlank()) {
      throw new IllegalStateException(
          "app.ai.enabled is true but app.ai.api-key is blank; set APP_AI_API_KEY or disable the"
              + " feature");
    }
    return new GroqAiAdapter(properties, objectMapper);
  }
}
