package org.coderacer.backend.security.jwt;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Duration;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

class JwtSecretValidatorTest {

  @Test
  void validateSecret_rejectsKnownDevelopmentSecretOutsideDevProfiles() {
    JwtSecretValidator validator =
        new JwtSecretValidator(
            new JwtProperties(JwtProperties.DEVELOPMENT_SECRET, Duration.ofMinutes(15)),
            new MockEnvironment());

    assertThatThrownBy(validator::validateSecret)
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("APP_JWT_SECRET");
  }

  @Test
  void validateSecret_allowsKnownDevelopmentSecretInTestProfile() {
    MockEnvironment environment = new MockEnvironment();
    environment.setActiveProfiles("test");
    JwtSecretValidator validator =
        new JwtSecretValidator(
            new JwtProperties(JwtProperties.DEVELOPMENT_SECRET, Duration.ofMinutes(15)),
            environment);

    assertThatCode(validator::validateSecret).doesNotThrowAnyException();
  }
}
