package org.coderacer.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.coderacer.backend.dto.LoginRequest;
import org.coderacer.backend.dto.UserResponse;
import org.coderacer.backend.enums.UserRole;
import org.coderacer.backend.exception.AuthenticationFailedException;
import org.coderacer.backend.exception.TooManyLoginAttemptsException;
import org.coderacer.backend.mapper.UserMapper;
import org.coderacer.backend.model.User;
import org.coderacer.backend.repository.UserRepository;
import org.coderacer.backend.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class AuthenticationServiceTest {

  @Mock private UserRepository repository;
  @Mock private PasswordEncoder passwordEncoder;
  @Mock private JwtService jwtService;
  @Mock private UserMapper userMapper;
  @Mock private LoginAttemptService loginAttemptService;

  private AuthenticationService service;

  @BeforeEach
  void setUp() {
    service =
        new AuthenticationService(
            repository, passwordEncoder, jwtService, userMapper, loginAttemptService);
  }

  @Test
  void login_returnsBearerTokenForVerifiedEnabledUser() {
    User user = verifiedUser("player");
    UserResponse userResponse =
        new UserResponse(
            user.getId(),
            "player@example.com",
            "player",
            UserRole.USER,
            true,
            true,
            Instant.now(),
            Instant.now());
    when(repository.findByEmailOrUsernameNormalized("player", "player"))
        .thenReturn(Optional.of(user));
    when(passwordEncoder.matches("StrongerPass123", "hashed-password")).thenReturn(true);
    when(jwtService.createAccessToken(user)).thenReturn("jwt-token");
    when(jwtService.accessTokenTtl()).thenReturn(Duration.ofMinutes(15));
    when(userMapper.toResponse(user)).thenReturn(userResponse);

    var response = service.login(new LoginRequest(" Player ", "StrongerPass123"), "127.0.0.1");

    assertThat(response.accessToken()).isEqualTo("jwt-token");
    assertThat(response.tokenType()).isEqualTo("Bearer");
    assertThat(response.expiresInSeconds()).isEqualTo(900);
    assertThat(response.user()).isEqualTo(userResponse);
    verify(loginAttemptService).assertAllowed(user.getId().toString(), "127.0.0.1");
    verify(loginAttemptService).recordSuccess(user.getId().toString(), "127.0.0.1");
  }

  @Test
  void login_returnsBearerTokenForEmailIdentifier() {
    User user = verifiedUser("player");
    UserResponse userResponse =
        new UserResponse(
            user.getId(),
            "player@example.com",
            "player",
            UserRole.USER,
            true,
            true,
            Instant.now(),
            Instant.now());
    when(repository.findByEmailOrUsernameNormalized("player@example.com", "player@example.com"))
        .thenReturn(Optional.of(user));
    when(passwordEncoder.matches("StrongerPass123", "hashed-password")).thenReturn(true);
    when(jwtService.createAccessToken(user)).thenReturn("jwt-token");
    when(jwtService.accessTokenTtl()).thenReturn(Duration.ofMinutes(15));
    when(userMapper.toResponse(user)).thenReturn(userResponse);

    var response =
        service.login(new LoginRequest(" Player@Example.com ", "StrongerPass123"), "127.0.0.1");

    assertThat(response.accessToken()).isEqualTo("jwt-token");
    assertThat(response.user()).isEqualTo(userResponse);
    verify(loginAttemptService).assertAllowed(user.getId().toString(), "127.0.0.1");
    verify(loginAttemptService).recordSuccess(user.getId().toString(), "127.0.0.1");
  }

  @Test
  void login_rejectsUnknownIdentifierAfterDummyPasswordCheck() {
    when(repository.findByEmailOrUsernameNormalized("unknown@example.com", "unknown@example.com"))
        .thenReturn(Optional.empty());

    assertThatThrownBy(
            () ->
                service.login(
                    new LoginRequest("unknown@example.com", "StrongerPass123"), "127.0.0.1"))
        .isInstanceOf(AuthenticationFailedException.class);
    verify(loginAttemptService).assertAllowed("unknown@example.com", "127.0.0.1");
    verify(loginAttemptService).recordFailure("unknown@example.com", "127.0.0.1");
    verify(passwordEncoder).matches(eq("StrongerPass123"), anyString());
  }

  @Test
  void login_rejectsNullIdentifierAsUnknownIdentifier() {
    when(repository.findByEmailOrUsernameNormalized("", "")).thenReturn(Optional.empty());

    assertThatThrownBy(() -> service.login(new LoginRequest(null, "StrongerPass123"), "127.0.0.1"))
        .isInstanceOf(AuthenticationFailedException.class);
    verify(loginAttemptService).assertAllowed("", "127.0.0.1");
    verify(loginAttemptService).recordFailure("", "127.0.0.1");
    verify(passwordEncoder).matches(eq("StrongerPass123"), anyString());
  }

  @Test
  void login_rejectsWrongPassword() {
    User user = verifiedUser("player");
    when(repository.findByEmailOrUsernameNormalized("player", "player"))
        .thenReturn(Optional.of(user));
    when(passwordEncoder.matches("WrongPass123", "hashed-password")).thenReturn(false);

    assertThatThrownBy(() -> service.login(new LoginRequest("player", "WrongPass123"), "127.0.0.1"))
        .isInstanceOf(AuthenticationFailedException.class);
    verify(loginAttemptService).assertAllowed(user.getId().toString(), "127.0.0.1");
    verify(loginAttemptService).recordFailure(user.getId().toString(), "127.0.0.1");
  }

  @Test
  void login_rejectsUsersThatCannotAuthenticate() {
    User unverified = verifiedUser("player");
    unverified.setEmailVerified(false);
    when(repository.findByEmailOrUsernameNormalized("player", "player"))
        .thenReturn(Optional.of(unverified));

    assertThatThrownBy(
            () -> service.login(new LoginRequest("player", "StrongerPass123"), "127.0.0.1"))
        .isInstanceOf(AuthenticationFailedException.class);
    verify(loginAttemptService).recordFailure(unverified.getId().toString(), "127.0.0.1");
    verify(passwordEncoder).matches("StrongerPass123", "hashed-password");
  }

  @Test
  void login_rejectsDisabledUsersAfterPasswordCheck() {
    User disabled = verifiedUser("player");
    disabled.setEnabled(false);
    when(repository.findByEmailOrUsernameNormalized("player", "player"))
        .thenReturn(Optional.of(disabled));

    assertThatThrownBy(
            () -> service.login(new LoginRequest("player", "StrongerPass123"), "127.0.0.1"))
        .isInstanceOf(AuthenticationFailedException.class);
    verify(loginAttemptService).recordFailure(disabled.getId().toString(), "127.0.0.1");
    verify(passwordEncoder).matches("StrongerPass123", "hashed-password");
  }

  @Test
  void login_rejectsDeletedUsersAfterPasswordCheck() {
    User deleted = verifiedUser("player");
    deleted.setDeleted(true);
    when(repository.findByEmailOrUsernameNormalized("player", "player"))
        .thenReturn(Optional.of(deleted));

    assertThatThrownBy(
            () -> service.login(new LoginRequest("player", "StrongerPass123"), "127.0.0.1"))
        .isInstanceOf(AuthenticationFailedException.class);
    verify(loginAttemptService).recordFailure(deleted.getId().toString(), "127.0.0.1");
    verify(passwordEncoder).matches("StrongerPass123", "hashed-password");
  }

  @Test
  void login_usesTheSameAttemptKeyForUsernameAndEmailIdentifiers() {
    User user = verifiedUser("player");
    when(repository.findByEmailOrUsernameNormalized("player@example.com", "player@example.com"))
        .thenReturn(Optional.of(user));
    when(repository.findByEmailOrUsernameNormalized("player", "player"))
        .thenReturn(Optional.of(user));
    when(passwordEncoder.matches("WrongPass123", "hashed-password")).thenReturn(false);

    assertThatThrownBy(
            () ->
                service.login(new LoginRequest("player@example.com", "WrongPass123"), "127.0.0.1"))
        .isInstanceOf(AuthenticationFailedException.class);
    assertThatThrownBy(() -> service.login(new LoginRequest("player", "WrongPass123"), "127.0.0.1"))
        .isInstanceOf(AuthenticationFailedException.class);

    verify(loginAttemptService, times(2)).recordFailure(user.getId().toString(), "127.0.0.1");
  }

  @Test
  void login_doesNotCheckPasswordWhenAttemptLimitIsExceeded() {
    User user = verifiedUser("player");
    when(repository.findByEmailOrUsernameNormalized("player", "player"))
        .thenReturn(Optional.of(user));
    doThrow(new TooManyLoginAttemptsException())
        .when(loginAttemptService)
        .assertAllowed(user.getId().toString(), "127.0.0.1");

    assertThatThrownBy(
            () -> service.login(new LoginRequest("player", "StrongerPass123"), "127.0.0.1"))
        .isInstanceOf(TooManyLoginAttemptsException.class);

    verify(passwordEncoder, never()).matches(anyString(), anyString());
    verify(loginAttemptService, never()).recordFailure(anyString(), anyString());
    verify(loginAttemptService, never()).recordSuccess(anyString(), anyString());
  }

  private User verifiedUser(String username) {
    User user = new User();
    user.setId(UUID.randomUUID());
    user.setEmail(username + "@example.com");
    user.setUsername(username);
    user.setPasswordHash("hashed-password");
    user.setRole(UserRole.USER);
    user.setEmailVerified(true);
    user.setEnabled(true);
    user.setDeleted(false);
    user.setTokenValidFrom(Instant.EPOCH);
    return user;
  }
}
