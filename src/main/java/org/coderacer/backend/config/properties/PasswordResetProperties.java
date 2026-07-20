package org.coderacer.backend.config.properties;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Duration;
import org.hibernate.validator.constraints.time.DurationMin;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "app.password-reset")
public record PasswordResetProperties(
    @NotNull @DurationMin(seconds = 1) Duration tokenTtl,
    @NotBlank String resetUrl) {}
