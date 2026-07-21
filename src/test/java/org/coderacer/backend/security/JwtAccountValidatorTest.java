package org.coderacer.backend.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.coderacer.backend.enums.UserRole;
import org.coderacer.backend.model.User;
import org.coderacer.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.oauth2.jwt.Jwt;

@ExtendWith(MockitoExtension.class)
class JwtAccountValidatorTest {

  @Mock private UserRepository repository;

  private JwtAccountValidator validator;

  @BeforeEach
  void setUp() {
    validator = new JwtAccountValidator(repository);
  }

  @Test
  void validate_acceptsActiveUserToken() {
    User user = user("player", UserRole.USER);
    when(repository.findByUsername("player")).thenReturn(Optional.of(user));

    var result = validator.validate(tokenFor(user));

    assertThat(result.hasErrors()).isFalse();
  }

  @Test
  void validate_rejectsTokenWithoutSubjectBeforeRepositoryLookup() {
    var result = validator.validate(tokenBuilder().build());

    assertThat(result.hasErrors()).isTrue();
    verifyNoInteractions(repository);
  }

  @Test
  void validate_rejectsTokenWithBlankSubjectBeforeRepositoryLookup() {
    var result = validator.validate(tokenBuilder().subject(" ").build());

    assertThat(result.hasErrors()).isTrue();
    verifyNoInteractions(repository);
  }

  @Test
  void validate_rejectsUnverifiedAccounts() {
    User unverified = user("player", UserRole.USER);
    unverified.setEmailVerified(false);
    when(repository.findByUsername("player")).thenReturn(Optional.of(unverified));

    var result = validator.validate(tokenFor(unverified));

    assertThat(result.hasErrors()).isTrue();
  }

  @Test
  void validate_rejectsDisabledAccounts() {
    User disabled = user("player", UserRole.USER);
    disabled.setEnabled(false);
    when(repository.findByUsername("player")).thenReturn(Optional.of(disabled));

    var result = validator.validate(tokenFor(disabled));

    assertThat(result.hasErrors()).isTrue();
  }

  @Test
  void validate_rejectsDeletedAccounts() {
    User deleted = user("player", UserRole.USER);
    deleted.setDeleted(true);
    when(repository.findByUsername("player")).thenReturn(Optional.of(deleted));

    var result = validator.validate(tokenFor(deleted));

    assertThat(result.hasErrors()).isTrue();
  }

  @Test
  void validate_rejectsRoleMismatch() {
    User user = user("player", UserRole.USER);
    when(repository.findByUsername("player")).thenReturn(Optional.of(user));

    var result =
        validator.validate(
            tokenBuilder().subject("player").claim("roles", List.of("ADMIN")).build());

    assertThat(result.hasErrors()).isTrue();
  }

  @Test
  void validate_rejectsMissingRoleClaim() {
    User user = user("player", UserRole.USER);
    when(repository.findByUsername("player")).thenReturn(Optional.of(user));

    var result =
        validator.validate(
            tokenBuilder()
                .subject("player")
                .claim("tokenValidFrom", user.getTokenValidFrom().toEpochMilli())
                .build());

    assertThat(result.hasErrors()).isTrue();
  }

  @Test
  void validate_rejectsStaleTokenVersion() {
    User user = user("player", UserRole.USER);
    when(repository.findByUsername("player")).thenReturn(Optional.of(user));

    var result =
        validator.validate(
            tokenBuilder()
                .subject("player")
                .claim("roles", List.of("USER"))
                .claim("tokenValidFrom", user.getTokenValidFrom().toEpochMilli() - 1)
                .build());

    assertThat(result.hasErrors()).isTrue();
  }

  @Test
  void validate_rejectsNonNumericTokenVersion() {
    User user = user("player", UserRole.USER);
    when(repository.findByUsername("player")).thenReturn(Optional.of(user));

    var result =
        validator.validate(
            tokenBuilder()
                .subject("player")
                .claim("roles", List.of("USER"))
                .claim("tokenValidFrom", "not-a-number")
                .build());

    assertThat(result.hasErrors()).isTrue();
  }

  private Jwt tokenFor(User user) {
    return tokenBuilder()
        .subject(user.getUsername())
        .claim("roles", List.of(user.getRole().name()))
        .claim("tokenValidFrom", user.getTokenValidFrom().toEpochMilli())
        .build();
  }

  private Jwt.Builder tokenBuilder() {
    Instant issuedAt = Instant.parse("2026-01-01T00:00:00Z");
    return Jwt.withTokenValue("token")
        .header("alg", "HS256")
        .issuedAt(issuedAt)
        .expiresAt(issuedAt.plusSeconds(900));
  }

  private User user(String username, UserRole role) {
    User user = new User();
    user.setId(UUID.randomUUID());
    user.setEmail(username + "@example.com");
    user.setUsername(username);
    user.setPasswordHash("hashed-password");
    user.setRole(role);
    user.setEmailVerified(true);
    user.setDeleted(false);
    user.setTokenValidFrom(Instant.EPOCH);
    return user;
  }
}
