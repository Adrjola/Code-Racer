package org.coderacer.backend.user.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.coderacer.backend.common.error.FieldError;
import org.coderacer.backend.common.exception.ConflictException;
import org.coderacer.backend.common.exception.ValidationException;
import org.coderacer.backend.user.dto.UserRegistrationRequest;
import org.coderacer.backend.user.mapper.UserMapper;
import org.coderacer.backend.user.model.User;
import org.coderacer.backend.user.model.UserRole;
import org.coderacer.backend.user.repository.UserRepository;
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

  private UserRegistrationService service;

  @BeforeEach
  void setUp() {
    service = new UserRegistrationService(repository, passwordEncoder, new UserMapper());
  }

  @Test
  void register_normalizesHashesAndCreatesUnverifiedUser() {
    UserRegistrationRequest request =
        new UserRegistrationRequest(
            " Player@Example.COM ", " Speed_Racer ", "StrongerPass123", "StrongerPass123");
    when(repository.existsByEmail("player@example.com")).thenReturn(false);
    when(repository.existsByUsername("speed_racer")).thenReturn(false);
    when(passwordEncoder.encode("StrongerPass123")).thenReturn("hashed-password");
    when(repository.saveAndFlush(any(User.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));

    var response = service.register(request);

    ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
    verify(repository).saveAndFlush(userCaptor.capture());
    User savedUser = userCaptor.getValue();
    assertThat(savedUser.getEmail()).isEqualTo("player@example.com");
    assertThat(savedUser.getUsername()).isEqualTo("speed_racer");
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
            ex ->
                assertThat(ex.getErrors())
                    .extracting(FieldError::field)
                    .contains("confirmPassword"));
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
            ex ->
                assertThat(ex.getErrors())
                    .extracting(FieldError::field)
                    .contains("email", "username"));
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
    when(repository.existsByUsername("speed_racer")).thenReturn(false);
    when(passwordEncoder.encode("StrongerPass123")).thenReturn("hashed-password");
    when(repository.saveAndFlush(any(User.class)))
        .thenThrow(new DataIntegrityViolationException("duplicate"));

    assertThatThrownBy(() -> service.register(request))
        .isInstanceOfSatisfying(
            ConflictException.class,
            ex -> assertThat(ex.getCode()).isEqualTo("USER_ALREADY_EXISTS"));
  }

  @Test
  void createInitialAdmin_createsVerifiedAdmin() {
    UserRegistrationRequest request =
        new UserRegistrationRequest(
            "admin@example.com", "root_admin", "StrongerPass123", "StrongerPass123");
    when(repository.existsByEmail("admin@example.com")).thenReturn(false);
    when(repository.existsByUsername("root_admin")).thenReturn(false);
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
  }
}
