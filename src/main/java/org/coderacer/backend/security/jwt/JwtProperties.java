package org.coderacer.backend.security.jwt;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "app.security.jwt")
public record JwtProperties(@NotBlank @Size(min = 32) String secret, Duration accessTokenTtl) {

  public JwtProperties {
    if (secret != null) {
      secret = secret.trim();
    }
    if (accessTokenTtl == null) {
      accessTokenTtl = Duration.ofMinutes(15);
    }
  }
}
