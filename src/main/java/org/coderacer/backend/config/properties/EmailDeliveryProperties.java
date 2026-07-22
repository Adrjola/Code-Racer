package org.coderacer.backend.config.properties;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "app.email.delivery")
public record EmailDeliveryProperties(@NotNull Mode mode, @NotBlank String from) {

  public enum Mode {
    SMTP,
    CAPTURED
  }
}
