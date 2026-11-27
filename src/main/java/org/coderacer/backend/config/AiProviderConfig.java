package org.coderacer.backend.config;

import java.time.Duration;
import org.coderacer.backend.config.properties.AiProviderProperties;
import org.coderacer.backend.service.AiProvider;
import org.coderacer.backend.service.GroqAiAdapter;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;
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
    return new GroqAiAdapter(properties, objectMapper, aiRestClient(properties));
  }

  private static RestClient aiRestClient(AiProviderProperties properties) {
    SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
    requestFactory.setConnectTimeout(
        Duration.ofSeconds(AiProviderProperties.CONNECT_TIMEOUT_SECONDS));
    requestFactory.setReadTimeout(Duration.ofSeconds(AiProviderProperties.READ_TIMEOUT_SECONDS));

    return RestClient.builder()
        .baseUrl(properties.baseUrl())
        .requestFactory(requestFactory)
        .defaultHeader("Authorization", "Bearer " + properties.apiKey())
        .build();
  }
}
