package org.coderacer.backend.user.service;

import lombok.RequiredArgsConstructor;
import org.coderacer.backend.user.config.AdminBootstrapProperties;
import org.coderacer.backend.user.dto.UserRegistrationRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class InitialAdminBootstrap implements ApplicationRunner {

  private static final Logger log = LoggerFactory.getLogger(InitialAdminBootstrap.class);

  private final AdminBootstrapProperties properties;
  private final UserRegistrationService service;

  @Override
  public void run(ApplicationArguments args) {
    if (!properties.enabled()) {
      return;
    }
    if (service.adminExists()) {
      log.info("Initial admin bootstrap skipped because an admin account already exists");
      return;
    }
    if (!properties.hasRequiredCredentials()) {
      throw new IllegalStateException(
          "Initial admin bootstrap is enabled but email, username, or password is missing");
    }

    service.createInitialAdmin(
        new UserRegistrationRequest(
            properties.email(),
            properties.username(),
            properties.password(),
            properties.password()));
    log.info("Initial admin account bootstrapped");
  }
}
