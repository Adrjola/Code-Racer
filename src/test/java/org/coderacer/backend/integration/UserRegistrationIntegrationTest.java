package org.coderacer.backend.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.coderacer.backend.config.properties.AdminBootstrapProperties;
import org.coderacer.backend.dto.UserRegistrationRequest;
import org.coderacer.backend.enums.UserRole;
import org.coderacer.backend.exception.ConflictException;
import org.coderacer.backend.exception.ValidationException;
import org.coderacer.backend.model.User;
import org.coderacer.backend.repository.UserRepository;
import org.coderacer.backend.service.InitialAdminBootstrap;
import org.coderacer.backend.service.UserRegistrationService;
import org.coderacer.backend.support.IntegrationTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

@IntegrationTest
@Transactional
class UserRegistrationIntegrationTest {

  @Autowired private UserRegistrationService service;
  @Autowired private UserRepository repository;
  @Autowired private PasswordEncoder passwordEncoder;

  @BeforeEach
  void setUp() {
    repository.deleteAll();
  }

  @Test
  void registrationPersistsNormalizedUnverifiedUserWithHashedPassword() {
    service.register(
        new UserRegistrationRequest(
            " Player@Example.COM ", " Speed_Racer ", "StrongerPass123", "StrongerPass123"));

    User savedUser = repository.findByEmail("player@example.com").orElseThrow();
    assertThat(savedUser.getUsername()).isEqualTo("Speed_Racer");
    assertThat(savedUser.getUsernameNormalized()).isEqualTo("speed_racer");
    assertThat(savedUser.getRole()).isEqualTo(UserRole.USER);
    assertThat(savedUser.isEmailVerified()).isFalse();
    assertThat(savedUser.isEnabled()).isTrue();
    assertThat(savedUser.isDeleted()).isFalse();
    assertThat(savedUser.getPasswordHash()).isNotEqualTo("StrongerPass123");
    assertThat(passwordEncoder.matches("StrongerPass123", savedUser.getPasswordHash())).isTrue();
  }

  @Test
  void duplicateNormalizedEmailOrUsernameIsRejectedWithoutCreatingAnotherUser() {
    service.register(
        new UserRegistrationRequest(
            "player@example.com", "speed_racer", "StrongerPass123", "StrongerPass123"));

    assertThatThrownBy(
            () ->
                service.register(
                    new UserRegistrationRequest(
                        " PLAYER@example.com ",
                        "another_racer",
                        "StrongerPass123",
                        "StrongerPass123")))
        .isInstanceOf(ConflictException.class);
    assertThatThrownBy(
            () ->
                service.register(
                    new UserRegistrationRequest(
                        "another@example.com",
                        " Speed_Racer ",
                        "StrongerPass123",
                        "StrongerPass123")))
        .isInstanceOf(ConflictException.class);
    assertThat(repository.count()).isEqualTo(1);
  }

  @Test
  void invalidRegistrationDoesNotPersistUser() {
    assertThatThrownBy(
            () ->
                service.register(
                    new UserRegistrationRequest(
                        "player@example.com",
                        "speed_racer",
                        "StrongerPass123",
                        "DifferentPass123")))
        .isInstanceOf(ValidationException.class);

    assertThat(repository.count()).isZero();
  }

  @Test
  void databaseUniqueConstraintsRejectDuplicateNormalizedIdentifiers() {
    repository.saveAndFlush(user("player@example.com", "speed_racer"));

    assertThatThrownBy(() -> repository.saveAndFlush(user("another@example.com", "Speed_Racer")))
        .isInstanceOf(DataIntegrityViolationException.class);
  }

  @Test
  void initialAdminBootstrapCreatesOneVerifiedAdminAndIsRepeatable() {
    InitialAdminBootstrap bootstrap =
        new InitialAdminBootstrap(
            new AdminBootstrapProperties(
                true, " Admin@Example.COM ", " Root_Admin ", "StrongerPass123"),
            service);

    bootstrap.run(null);
    bootstrap.run(null);

    var admins =
        repository.findAll().stream().filter(user -> user.getRole() == UserRole.ADMIN).toList();
    assertThat(admins).hasSize(1);
    User admin = admins.getFirst();
    assertThat(admin.getEmail()).isEqualTo("admin@example.com");
    assertThat(admin.getUsername()).isEqualTo("Root_Admin");
    assertThat(admin.getUsernameNormalized()).isEqualTo("root_admin");
    assertThat(admin.isEmailVerified()).isTrue();
    assertThat(passwordEncoder.matches("StrongerPass123", admin.getPasswordHash())).isTrue();
  }

  private User user(String email, String username) {
    User user = new User();
    user.setEmail(email);
    user.setUsername(username);
    user.setPasswordHash(passwordEncoder.encode("StrongerPass123"));
    user.setRole(UserRole.USER);
    user.setEmailVerified(false);
    user.setEnabled(true);
    user.setDeleted(false);
    return user;
  }
}
