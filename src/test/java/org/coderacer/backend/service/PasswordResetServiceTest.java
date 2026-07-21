package org.coderacer.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;
import org.coderacer.backend.config.properties.PasswordResetProperties;
import org.coderacer.backend.dto.ForgotPasswordRequest;
import org.coderacer.backend.dto.ResetPasswordRequest;
import org.coderacer.backend.enums.UserRole;
import org.coderacer.backend.exception.PasswordResetFailedException;
import org.coderacer.backend.model.PasswordResetToken;
import org.coderacer.backend.model.User;
import org.coderacer.backend.repository.PasswordResetTokenRepository;
import org.coderacer.backend.repository.UserRepository;
import org.coderacer.backend.util.Sha256Hasher;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class PasswordResetServiceTest {

  private static final Instant NOW = Instant.parse("2026-07-21T10:15:30Z");

  @Mock private PasswordResetTokenRepository tokenRepository;
  @Mock private UserRepository userRepository;
  @Mock private SecureTokenGenerator tokenGenerator;
  @Mock private ApplicationEventPublisher eventPublisher;
  @Mock private PasswordEncoder passwordEncoder;

  private PasswordResetService service;

  @BeforeEach
  void setUp() {
    service =
        new PasswordResetService(
            tokenRepository,
            userRepository,
            tokenGenerator,
            new PasswordResetProperties(Duration.ofHours(1), "http://localhost:5173/reset"),
            eventPublisher,
            passwordEncoder,
            Clock.fixed(NOW, ZoneOffset.UTC));
  }

  @Test
  void requestReset_storesOnlyTokenHashAndPublishesRawTokenForExistingUser() {
    User user = verifiedUser();
    when(userRepository.findByEmailForUpdate("player@example.com")).thenReturn(Optional.of(user));
    when(tokenGenerator.generate()).thenReturn("raw-reset-token");

    service.requestReset(new ForgotPasswordRequest(" Player@Example.COM "));

    verify(tokenRepository).revokeActiveTokensForUser(user, NOW);

    ArgumentCaptor<PasswordResetToken> tokenCaptor =
        ArgumentCaptor.forClass(PasswordResetToken.class);
    verify(tokenRepository).save(tokenCaptor.capture());
    PasswordResetToken savedToken = tokenCaptor.getValue();
    assertThat(savedToken.getUser()).isEqualTo(user);
    assertThat(savedToken.getTokenHash()).isEqualTo(hash("raw-reset-token"));
    assertThat(savedToken.getTokenHash()).doesNotContain("raw-reset-token");
    assertThat(savedToken.getExpiresAt()).isEqualTo(NOW.plus(Duration.ofHours(1)));

    ArgumentCaptor<PasswordResetRequestedEvent> eventCaptor =
        ArgumentCaptor.forClass(PasswordResetRequestedEvent.class);
    verify(eventPublisher).publishEvent(eventCaptor.capture());
    PasswordResetRequestedEvent event = eventCaptor.getValue();
    assertThat(event.email()).isEqualTo("player@example.com");
    assertThat(event.rawToken()).isEqualTo("raw-reset-token");
    assertThat(event.expiresAt()).isEqualTo(savedToken.getExpiresAt());
  }

  @Test
  void requestReset_returnsNeutralResponseWithoutSendingForUnknownEmail() {
    when(userRepository.findByEmailForUpdate("missing@example.com")).thenReturn(Optional.empty());

    var response = service.requestReset(new ForgotPasswordRequest(" missing@example.com "));

    assertThat(response.message())
        .isEqualTo(
            "If an account with the provided email exists, a password reset email will be sent.");
    verify(tokenRepository, never()).save(any());
    verify(eventPublisher, never()).publishEvent(any());
  }

  @Test
  void resetPassword_encodesPasswordMarksTokenUsedAndRevokesOtherTokens() {
    User user = verifiedUser();
    PasswordResetToken token = usableToken(user, "raw-reset-token");
    when(tokenRepository.findByTokenHashForUpdate(hash("raw-reset-token")))
        .thenReturn(Optional.of(token));
    when(passwordEncoder.encode("NewPassword123")).thenReturn("encoded-password");

    service.resetPassword(
        new ResetPasswordRequest(" raw-reset-token ", "NewPassword123", "NewPassword123"));

    assertThat(user.getPasswordHash()).isEqualTo("encoded-password");
    assertThat(token.getUsedAt()).isEqualTo(NOW);
    verify(tokenRepository).revokeOtherActiveTokensForUser(user, token.getId(), NOW);
  }

  @Test
  void resetPassword_rejectsPasswordConfirmationMismatchBeforeTokenLookup() {
    assertThatThrownBy(
            () ->
                service.resetPassword(
                    new ResetPasswordRequest("raw-reset-token", "NewPassword123", "Different123")))
        .isInstanceOf(PasswordResetFailedException.class);

    verify(tokenRepository, never()).findByTokenHashForUpdate(any());
    verify(passwordEncoder, never()).encode(any());
  }

  @Test
  void resetPassword_rejectsExpiredToken() {
    User user = verifiedUser();
    PasswordResetToken token = usableToken(user, "expired-token");
    token.setExpiresAt(NOW.minusSeconds(1));
    when(tokenRepository.findByTokenHashForUpdate(hash("expired-token")))
        .thenReturn(Optional.of(token));

    assertThatThrownBy(
            () ->
                service.resetPassword(
                    new ResetPasswordRequest("expired-token", "NewPassword123", "NewPassword123")))
        .isInstanceOf(PasswordResetFailedException.class);

    assertThat(user.getPasswordHash()).isEqualTo("old-password-hash");
    assertThat(token.getUsedAt()).isNull();
    verify(passwordEncoder, never()).encode(any());
  }

  @Test
  void resetPassword_rejectsUsedToken() {
    User user = verifiedUser();
    PasswordResetToken token = usableToken(user, "used-token");
    token.setUsedAt(NOW.minusSeconds(1));
    when(tokenRepository.findByTokenHashForUpdate(hash("used-token")))
        .thenReturn(Optional.of(token));

    assertThatThrownBy(
            () ->
                service.resetPassword(
                    new ResetPasswordRequest("used-token", "NewPassword123", "NewPassword123")))
        .isInstanceOf(PasswordResetFailedException.class);

    assertThat(user.getPasswordHash()).isEqualTo("old-password-hash");
    verify(passwordEncoder, never()).encode(any());
  }

  @Test
  void resetPassword_rejectsRevokedToken() {
    User user = verifiedUser();
    PasswordResetToken token = usableToken(user, "revoked-token");
    token.setRevokedAt(NOW.minusSeconds(1));
    when(tokenRepository.findByTokenHashForUpdate(hash("revoked-token")))
        .thenReturn(Optional.of(token));

    assertThatThrownBy(
            () ->
                service.resetPassword(
                    new ResetPasswordRequest("revoked-token", "NewPassword123", "NewPassword123")))
        .isInstanceOf(PasswordResetFailedException.class);

    assertThat(user.getPasswordHash()).isEqualTo("old-password-hash");
    verify(passwordEncoder, never()).encode(any());
  }

  private PasswordResetToken usableToken(User user, String rawToken) {
    PasswordResetToken token = new PasswordResetToken();
    token.setId(UUID.randomUUID());
    token.setUser(user);
    token.setTokenHash(hash(rawToken));
    token.setExpiresAt(NOW.plus(Duration.ofMinutes(30)));
    return token;
  }

  private User verifiedUser() {
    User user = new User();
    user.setId(UUID.randomUUID());
    user.setEmail("player@example.com");
    user.setUsername("player");
    user.setPasswordHash("old-password-hash");
    user.setRole(UserRole.USER);
    user.setEmailVerified(true);
    user.setDeleted(false);
    user.setTokenValidFrom(Instant.EPOCH);
    return user;
  }

  private String hash(String rawToken) {
    return Sha256Hasher.hash(rawToken);
  }
}
