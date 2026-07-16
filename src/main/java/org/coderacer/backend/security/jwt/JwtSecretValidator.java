package org.coderacer.backend.security.jwt;

import jakarta.annotation.PostConstruct;
import java.util.Arrays;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class JwtSecretValidator {

  private static final Set<String> DEV_PROFILES = Set.of("dev", "local", "test");

  private final JwtProperties properties;
  private final Environment environment;

  @PostConstruct
  void validateSecret() {
    if (isUnsafeExampleSecret(properties.secret()) && !isDevProfileActive()) {
      throw new IllegalStateException(
          "APP_JWT_SECRET must be set to a deployment-specific value outside dev/test profiles");
    }
  }

  private boolean isUnsafeExampleSecret(String secret) {
    return JwtProperties.DEVELOPMENT_SECRET.equals(secret)
        || JwtProperties.EXAMPLE_SECRET.equals(secret);
  }

  private boolean isDevProfileActive() {
    return Arrays.stream(environment.getActiveProfiles()).anyMatch(DEV_PROFILES::contains);
  }
}
