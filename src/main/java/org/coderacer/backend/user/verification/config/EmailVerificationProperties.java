package org.coderacer.backend.user.verification.config;

import jakarta.validation.constraints.NotBlank;
import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "app.email-verification")
public record EmailVerificationProperties(
    Duration tokenTtl, Duration resendCooldown, @NotBlank String verificationUrl) {

  public EmailVerificationProperties {
    if (tokenTtl == null) {
      tokenTtl = Duration.ofHours(24);
    }
    if (resendCooldown == null) {
      resendCooldown = Duration.ZERO;
    }
    if (tokenTtl.isZero() || tokenTtl.isNegative()) {
      throw new IllegalArgumentException("Email verification token TTL must be positive");
    }
    if (resendCooldown.isNegative()) {
      throw new IllegalArgumentException("Email verification resend cooldown cannot be negative");
    }
  }
}
