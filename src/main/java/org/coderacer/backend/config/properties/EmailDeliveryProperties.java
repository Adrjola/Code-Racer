package org.coderacer.backend.config.properties;

import jakarta.validation.constraints.NotBlank;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "app.email.delivery")
public record EmailDeliveryProperties(Mode mode, @NotBlank String from) {

  public EmailDeliveryProperties {
    if (mode == null) {
      mode = Mode.SMTP;
    }
  }

  public enum Mode {
    SMTP,
    CAPTURED
  }
}
