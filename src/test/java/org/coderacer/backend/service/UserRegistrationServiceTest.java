package org.coderacer.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.coderacer.backend.dto.UserRegistrationRequest;
import org.coderacer.backend.enums.UserRole;
import org.coderacer.backend.exception.ConflictException;
import org.coderacer.backend.exception.ValidationException;
import org.coderacer.backend.mapper.UserMapper;
import org.coderacer.backend.model.User;
import org.coderacer.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class UserRegistrationServiceTest {

  @Mock private UserRepository repository;
  @Mock private PasswordEncoder passwordEncoder;
  @Mock private EmailVerificationService emailVerificationService;

  private UserRegistrationService service;

  @BeforeEach
  void setUp() {
    service =
        new UserRegistrationService(
            repository, passwordEncoder, new UserMapper(), emailVerificationService);
  }

  @Test
  void register_normalizesHashesAndCreatesUnverifiedUser() {
    UserRegistrationRequest request =
        new UserRegistrationRequest(
            " Player@Example.COM ", " Speed_Racer ", "StrongerPass123", "StrongerPass123");
    when(repository.existsByEmail("player@example.com")).thenReturn(false);
    when(repository.existsByUsernameNormalized("speed_racer")).thenReturn(false);
    when(passwordEncoder.encode("StrongerPass123")).thenReturn("hashed-password");
    when(repository.saveAndFlush(any(User.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));

    var response = service.register(request);

    ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
    verify(repository).saveAndFlush(userCaptor.capture());
    User savedUser = userCaptor.getValue();
    verify(emailVerificationService).sendInitialVerificationEmail(savedUser);
    assertThat(savedUser.getEmail()).isEqualTo("player@example.com");
    assertThat(savedUser.getUsername()).isEqualTo("Speed_Racer");
    assertThat(savedUser.getUsernameNormalized()).isEqualTo("speed_racer");
    assertThat(savedUser.getPasswordHash()).isEqualTo("hashed-password");
    assertThat(savedUser.getPasswordHash()).isNotEqualTo("StrongerPass123");
    assertThat(savedUser.getRole()).isEqualTo(UserRole.USER);
    assertThat(savedUser.isEmailVerified()).isFalse();
    assertThat(savedUser.isEnabled()).isTrue();
    assertThat(savedUser.isDeleted()).isFalse();
    assertThat(response.email()).isEqualTo("player@example.com");
    assertThat(response.role()).isEqualTo(UserRole.USER);
  }

  @Test
  void register_rejectsPasswordConfirmationMismatch() {
    UserRegistrationRequest request =
        new UserRegistrationRequest(
            "player@example.com", "speed_racer", "StrongerPass123", "DifferentPass123");

    assertThatThrownBy(() -> service.register(request))
        .isInstanceOfSatisfying(
            ValidationException.class,
            ex -> assertThat(ex.getMessage()).contains("confirmPassword must match password"));
    verify(repository, never()).saveAndFlush(any());
  }

  @Test
  void register_rejectsInvalidEmailAndUsername() {
    UserRegistrationRequest request =
        new UserRegistrationRequest(
            "not-an-email", "no spaces", "StrongerPass123", "StrongerPass123");

    assertThatThrownBy(() -> service.register(request))
        .isInstanceOfSatisfying(
            ValidationException.class,
            ex -> assertThat(ex.getMessage()).contains("email", "username"));
    verify(repository, never()).saveAndFlush(any());
  }

  @Test
  void register_rejectsValuesAboveConfiguredLengthLimits() {
    String longEmail = "a".repeat(110) + "@example.com";
    String longUsername = "u".repeat(21);
    String longPassword = "P".repeat(17);
    UserRegistrationRequest request =
        new UserRegistrationRequest(longEmail, longUsername, longPassword, longPassword);

    assertThatThrownBy(() -> service.register(request))
        .isInstanceOfSatisfying(
            ValidationException.class,
            ex -> assertThat(ex.getMessage()).contains("email", "username", "password"));
    verify(repository, never()).saveAndFlush(any());
  }

  @Test
  void register_rejectsPasswordBelowConfiguredMinimumLength() {
    UserRegistrationRequest request =
        new UserRegistrationRequest("player@example.com", "speed_racer", "Short1", "Short1");

    assertThatThrownBy(() -> service.register(request))
        .isInstanceOfSatisfying(
            ValidationException.class, ex -> assertThat(ex.getMessage()).contains("password"));
    verify(repository, never()).saveAndFlush(any());
  }

  @Test
  void register_rejectsDuplicateNormalizedIdentifiers() {
    UserRegistrationRequest request =
        new UserRegistrationRequest(
            " Player@Example.COM ", "Speed_Racer", "StrongerPass123", "StrongerPass123");
    when(repository.existsByEmail("player@example.com")).thenReturn(true);

    assertThatThrownBy(() -> service.register(request))
        .isInstanceOfSatisfying(
            ConflictException.class,
            ex -> assertThat(ex.getCode()).isEqualTo("USER_ALREADY_EXISTS"));
    verify(repository, never()).saveAndFlush(any());
  }

  @Test
  void register_mapsDatabaseUniquenessRaceToConflict() {
    UserRegistrationRequest request =
        new UserRegistrationRequest(
            "player@example.com", "speed_racer", "StrongerPass123", "StrongerPass123");
    when(repository.existsByEmail("player@example.com")).thenReturn(false);
    when(repository.existsByUsernameNormalized("speed_racer")).thenReturn(false);
    when(passwordEncoder.encode("StrongerPass123")).thenReturn("hashed-password");
    when(repository.saveAndFlush(any(User.class)))
        .thenThrow(new DataIntegrityViolationException("duplicate"));

    assertThatThrownBy(() -> service.register(request))
        .isInstanceOfSatisfying(
            ConflictException.class,
            ex -> assertThat(ex.getCode()).isEqualTo("USER_ALREADY_EXISTS"));
  }

  @Test
  void register_doesNotMapVerificationTokenFailureToDuplicateUser() {
    UserRegistrationRequest request =
        new UserRegistrationRequest(
            "player@example.com", "speed_racer", "StrongerPass123", "StrongerPass123");
    when(repository.existsByEmail("player@example.com")).thenReturn(false);
    when(repository.existsByUsernameNormalized("speed_racer")).thenReturn(false);
    when(passwordEncoder.encode("StrongerPass123")).thenReturn("hashed-password");
    when(repository.saveAndFlush(any(User.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));
    doThrow(new DataIntegrityViolationException("token collision"))
        .when(emailVerificationService)
        .sendInitialVerificationEmail(any(User.class));

    assertThatThrownBy(() -> service.register(request))
        .isInstanceOf(DataIntegrityViolationException.class);
  }

  @Test
  void createInitialAdmin_createsVerifiedAdmin() {
    UserRegistrationRequest request =
        new UserRegistrationRequest(
            "admin@example.com", "root_admin", "StrongerPass123", "StrongerPass123");
    when(repository.existsByEmail("admin@example.com")).thenReturn(false);
    when(repository.existsByUsernameNormalized("root_admin")).thenReturn(false);
    when(passwordEncoder.encode("StrongerPass123")).thenReturn("hashed-admin-password");
    when(repository.saveAndFlush(any(User.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));

    service.createInitialAdmin(request);

    ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
    verify(repository).saveAndFlush(userCaptor.capture());
    User savedUser = userCaptor.getValue();
    assertThat(savedUser.getRole()).isEqualTo(UserRole.ADMIN);
    assertThat(savedUser.isEmailVerified()).isTrue();
    assertThat(savedUser.getPasswordHash()).isEqualTo("hashed-admin-password");
    verify(emailVerificationService, never()).sendInitialVerificationEmail(any());
  }
}
