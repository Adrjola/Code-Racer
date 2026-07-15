package org.coderacer.backend.auth.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.coderacer.backend.auth.dto.LoginRequest;
import org.coderacer.backend.auth.exception.AuthenticationFailedException;
import org.coderacer.backend.security.service.JwtService;
import org.coderacer.backend.user.dto.UserResponse;
import org.coderacer.backend.user.mapper.UserMapper;
import org.coderacer.backend.user.model.User;
import org.coderacer.backend.user.model.UserRole;
import org.coderacer.backend.user.repository.UserRepository;
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

  private AuthenticationService service;

  @BeforeEach
  void setUp() {
    service = new AuthenticationService(repository, passwordEncoder, jwtService, userMapper);
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
    when(repository.findByUsername("player")).thenReturn(Optional.of(user));
    when(passwordEncoder.matches("StrongerPass123", "hashed-password")).thenReturn(true);
    when(jwtService.createAccessToken(user)).thenReturn("jwt-token");
    when(jwtService.accessTokenTtl()).thenReturn(Duration.ofMinutes(15));
    when(userMapper.toResponse(user)).thenReturn(userResponse);

    var response = service.login(new LoginRequest(" Player ", "StrongerPass123"));

    assertThat(response.accessToken()).isEqualTo("jwt-token");
    assertThat(response.tokenType()).isEqualTo("Bearer");
    assertThat(response.expiresInSeconds()).isEqualTo(900);
    assertThat(response.user()).isEqualTo(userResponse);
  }

  @Test
  void login_rejectsEmailIdentifierWithoutPasswordCheck() {
    when(repository.findByUsername("player@example.com")).thenReturn(Optional.empty());

    assertThatThrownBy(
            () -> service.login(new LoginRequest("player@example.com", "StrongerPass123")))
        .isInstanceOf(AuthenticationFailedException.class);
    verify(passwordEncoder, never()).matches("StrongerPass123", "hashed-password");
  }

  @Test
  void login_rejectsNullUsernameAsUnknownIdentifier() {
    when(repository.findByUsername("")).thenReturn(Optional.empty());

    assertThatThrownBy(() -> service.login(new LoginRequest(null, "StrongerPass123")))
        .isInstanceOf(AuthenticationFailedException.class);
    verify(passwordEncoder, never()).matches("StrongerPass123", "hashed-password");
  }

  @Test
  void login_rejectsWrongPassword() {
    User user = verifiedUser("player");
    when(repository.findByUsername("player")).thenReturn(Optional.of(user));
    when(passwordEncoder.matches("WrongPass123", "hashed-password")).thenReturn(false);

    assertThatThrownBy(() -> service.login(new LoginRequest("player", "WrongPass123")))
        .isInstanceOf(AuthenticationFailedException.class);
  }

  @Test
  void login_rejectsUsersThatCannotAuthenticate() {
    User unverified = verifiedUser("player");
    unverified.setEmailVerified(false);
    when(repository.findByUsername("player")).thenReturn(Optional.of(unverified));

    assertThatThrownBy(() -> service.login(new LoginRequest("player", "StrongerPass123")))
        .isInstanceOf(AuthenticationFailedException.class);
    verify(passwordEncoder, never()).matches("StrongerPass123", "hashed-password");
  }

  @Test
  void login_rejectsDisabledUsersWithoutPasswordCheck() {
    User disabled = verifiedUser("player");
    disabled.setEnabled(false);
    when(repository.findByUsername("player")).thenReturn(Optional.of(disabled));

    assertThatThrownBy(() -> service.login(new LoginRequest("player", "StrongerPass123")))
        .isInstanceOf(AuthenticationFailedException.class);
    verify(passwordEncoder, never()).matches("StrongerPass123", "hashed-password");
  }

  @Test
  void login_rejectsDeletedUsersWithoutPasswordCheck() {
    User deleted = verifiedUser("player");
    deleted.setDeleted(true);
    when(repository.findByUsername("player")).thenReturn(Optional.of(deleted));

    assertThatThrownBy(() -> service.login(new LoginRequest("player", "StrongerPass123")))
        .isInstanceOf(AuthenticationFailedException.class);
    verify(passwordEncoder, never()).matches("StrongerPass123", "hashed-password");
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
    user.setTokenValidAfter(Instant.EPOCH);
    return user;
  }
}
