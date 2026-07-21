package org.coderacer.backend.config.properties;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Duration;
import org.hibernate.validator.constraints.time.DurationMin;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "app.security.jwt")
public record JwtProperties(
    @NotBlank @Size(min = 32) String secret,
    @NotNull @DurationMin(seconds = 1) Duration accessTokenTtl) {

  public JwtProperties {
    if (secret != null) {
      secret = secret.trim();
    }
  }
}
