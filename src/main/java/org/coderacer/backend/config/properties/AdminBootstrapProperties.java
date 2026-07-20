package org.coderacer.backend.config.properties;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.admin.bootstrap")
public record AdminBootstrapProperties(
    boolean enabled, String email, String username, String password) {

  public boolean hasRequiredCredentials() {
    return hasText(email) && hasText(username) && hasText(password);
  }

  private boolean hasText(String value) {
    return value != null && !value.isBlank();
  }
}
