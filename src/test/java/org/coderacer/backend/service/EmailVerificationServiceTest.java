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
import org.coderacer.backend.config.properties.EmailVerificationProperties;
import org.coderacer.backend.dto.EmailVerificationConfirmRequest;
import org.coderacer.backend.dto.EmailVerificationResendRequest;
import org.coderacer.backend.dto.UserResponse;
import org.coderacer.backend.enums.UserRole;
import org.coderacer.backend.exception.EmailVerificationFailedException;
import org.coderacer.backend.mapper.UserMapper;
import org.coderacer.backend.model.EmailVerificationToken;
import org.coderacer.backend.model.User;
import org.coderacer.backend.repository.EmailVerificationTokenRepository;
import org.coderacer.backend.repository.UserRepository;
import org.coderacer.backend.util.Sha256Hasher;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

@ExtendWith(MockitoExtension.class)
class EmailVerificationServiceTest {

  private static final Instant NOW = Instant.parse("2026-07-16T10:15:30Z");

  @Mock private EmailVerificationTokenRepository tokenRepository;
  @Mock private UserRepository userRepository;
  @Mock private EmailVerificationTokenGenerator tokenGenerator;
  @Mock private ApplicationEventPublisher eventPublisher;
  @Mock private UserMapper userMapper;

  private EmailVerificationService service;

  @BeforeEach
  void setUp() {
    service =
        new EmailVerificationService(
            tokenRepository,
            userRepository,
            tokenGenerator,
            new EmailVerificationProperties(
                Duration.ofHours(24), Duration.ofMinutes(2), "http://localhost:5173/verify-email"),
            eventPublisher,
            userMapper,
            Clock.fixed(NOW, ZoneOffset.UTC));
  }

  @Test
  void sendInitialVerificationEmail_storesOnlyTokenHashAndPublishesEmailEvent() {
    User user = unverifiedUser();
    when(tokenGenerator.generate()).thenReturn("raw-token");

    service.sendInitialVerificationEmail(user);

    ArgumentCaptor<EmailVerificationToken> tokenCaptor =
        ArgumentCaptor.forClass(EmailVerificationToken.class);
    verify(tokenRepository).save(tokenCaptor.capture());
    EmailVerificationToken savedToken = tokenCaptor.getValue();
    assertThat(savedToken.getUser()).isEqualTo(user);
    assertThat(savedToken.getTokenHash()).isEqualTo(hash("raw-token"));
    assertThat(savedToken.getTokenHash()).doesNotContain("raw-token");
    assertThat(savedToken.getExpiresAt()).isEqualTo(NOW.plus(Duration.ofHours(24)));

    ArgumentCaptor<EmailVerificationRequestedEvent> eventCaptor =
        ArgumentCaptor.forClass(EmailVerificationRequestedEvent.class);
    verify(eventPublisher).publishEvent(eventCaptor.capture());
    EmailVerificationRequestedEvent event = eventCaptor.getValue();
    assertThat(event.email()).isEqualTo("player@example.com");
    assertThat(event.verificationLink())
        .isEqualTo("http://localhost:5173/verify-email?token=raw-token");
    assertThat(event.expiresAt()).isEqualTo(savedToken.getExpiresAt());
    verify(tokenRepository, never()).revokeActiveTokensForUser(any(), any());
  }

  @Test
  void sendInitialVerificationEmail_skipsUsersThatDoNotNeedVerification() {
    User verified = unverifiedUser();
    verified.setEmailVerified(true);

    service.sendInitialVerificationEmail(verified);

    verify(tokenRepository, never()).save(any());
    verify(eventPublisher, never()).publishEvent(any());
  }

  @Test
  void confirm_verifiesUserMarksTokenUsedAndRevokesOtherTokens() {
    User user = unverifiedUser();
    EmailVerificationToken token = usableToken(user, "raw-token");
    UserResponse response =
        new UserResponse(
            user.getId(),
            user.getEmail(),
            user.getUsername(),
            user.getRole(),
            true,
            true,
            NOW,
            NOW);
    when(tokenRepository.findByTokenHashForUpdate(hash("raw-token")))
        .thenReturn(Optional.of(token));
    when(userMapper.toResponse(user)).thenReturn(response);

    UserResponse result = service.confirm(new EmailVerificationConfirmRequest(" raw-token "));

    assertThat(result).isEqualTo(response);
    assertThat(user.isEmailVerified()).isTrue();
    assertThat(token.getUsedAt()).isEqualTo(NOW);
    verify(tokenRepository).revokeOtherActiveTokensForUser(user, token.getId(), NOW);
  }

  @Test
  void confirm_rejectsUsersThatCannotVerifyEmail() {
    User user = unverifiedUser();
    user.setEnabled(false);
    EmailVerificationToken token = usableToken(user, "raw-token");
    when(tokenRepository.findByTokenHashForUpdate(hash("raw-token")))
        .thenReturn(Optional.of(token));

    assertThatThrownBy(() -> service.confirm(new EmailVerificationConfirmRequest("raw-token")))
        .isInstanceOf(EmailVerificationFailedException.class);

    assertThat(user.isEmailVerified()).isFalse();
    assertThat(token.getUsedAt()).isNull();
    verify(tokenRepository, never()).revokeOtherActiveTokensForUser(any(), any(), any());
  }

  @Test
  void confirm_rejectsMissingExpiredUsedAndRevokedTokensSafely() {
    User user = unverifiedUser();
    EmailVerificationToken expired = usableToken(user, "expired-token");
    expired.setExpiresAt(NOW.minusSeconds(1));
    EmailVerificationToken used = usableToken(user, "used-token");
    used.setUsedAt(NOW.minusSeconds(30));
    EmailVerificationToken revoked = usableToken(user, "revoked-token");
    revoked.setRevokedAt(NOW.minusSeconds(30));

    when(tokenRepository.findByTokenHashForUpdate(hash("missing-token")))
        .thenReturn(Optional.empty());
    when(tokenRepository.findByTokenHashForUpdate(hash("expired-token")))
        .thenReturn(Optional.of(expired));
    when(tokenRepository.findByTokenHashForUpdate(hash("used-token")))
        .thenReturn(Optional.of(used));
    when(tokenRepository.findByTokenHashForUpdate(hash("revoked-token")))
        .thenReturn(Optional.of(revoked));

    assertThatThrownBy(() -> service.confirm(new EmailVerificationConfirmRequest("missing-token")))
        .isInstanceOf(EmailVerificationFailedException.class);
    assertThatThrownBy(() -> service.confirm(new EmailVerificationConfirmRequest("expired-token")))
        .isInstanceOf(EmailVerificationFailedException.class);
    assertThatThrownBy(() -> service.confirm(new EmailVerificationConfirmRequest("used-token")))
        .isInstanceOf(EmailVerificationFailedException.class);
    assertThatThrownBy(() -> service.confirm(new EmailVerificationConfirmRequest("revoked-token")))
        .isInstanceOf(EmailVerificationFailedException.class);

    assertThat(user.isEmailVerified()).isFalse();
    verify(tokenRepository, never()).revokeOtherActiveTokensForUser(any(), any(), any());
  }

  @Test
  void resend_returnsNeutralResponseWithoutSendingForUnknownOrVerifiedAccounts() {
    User verified = unverifiedUser();
    verified.setEmailVerified(true);
    when(userRepository.findByEmailForUpdate("missing@example.com")).thenReturn(Optional.empty());
    when(userRepository.findByEmailForUpdate("verified@example.com"))
        .thenReturn(Optional.of(verified));

    assertThat(
            service.resend(new EmailVerificationResendRequest(" missing@example.com ")).message())
        .isEqualTo("If an unverified account exists, a verification email will be sent.");
    assertThat(service.resend(new EmailVerificationResendRequest("verified@example.com")).message())
        .isEqualTo("If an unverified account exists, a verification email will be sent.");

    verify(tokenRepository, never()).save(any());
    verify(eventPublisher, never()).publishEvent(any());
  }

  @Test
  void resend_createsNewTokenForUnverifiedUserWhenCooldownElapsed() {
    User user = unverifiedUser();
    user.markVerificationEmailResent(NOW.minus(Duration.ofMinutes(3)));
    when(userRepository.findByEmailForUpdate("player@example.com")).thenReturn(Optional.of(user));
    when(tokenGenerator.generate()).thenReturn("new-token");

    service.resend(new EmailVerificationResendRequest(" Player@Example.COM "));

    assertThat(user.getVerificationEmailResentAt()).isEqualTo(NOW);
    verify(tokenRepository).revokeActiveTokensForUser(user, NOW);
    verify(tokenRepository).save(any(EmailVerificationToken.class));
    verify(eventPublisher).publishEvent(any(EmailVerificationRequestedEvent.class));
  }

  @Test
  void resend_allowsFirstResendWithoutWaitingForInitialRegistrationTokenCooldown() {
    User user = unverifiedUser();
    when(userRepository.findByEmailForUpdate("player@example.com")).thenReturn(Optional.of(user));
    when(tokenGenerator.generate()).thenReturn("new-token");

    service.resend(new EmailVerificationResendRequest("player@example.com"));

    assertThat(user.getVerificationEmailResentAt()).isEqualTo(NOW);
    verify(tokenRepository).save(any());
    verify(eventPublisher).publishEvent(any(EmailVerificationRequestedEvent.class));
  }

  @Test
  void resend_obeysCooldownWithoutReusingRawToken() {
    User user = unverifiedUser();
    user.markVerificationEmailResent(NOW.minusSeconds(30));
    when(userRepository.findByEmailForUpdate("player@example.com")).thenReturn(Optional.of(user));

    service.resend(new EmailVerificationResendRequest("player@example.com"));

    verify(tokenRepository, never()).save(any());
    verify(eventPublisher, never()).publishEvent(any());
  }

  private EmailVerificationToken usableToken(User user, String rawToken) {
    EmailVerificationToken token = new EmailVerificationToken();
    token.setId(UUID.randomUUID());
    token.setUser(user);
    token.setTokenHash(hash(rawToken));
    token.setExpiresAt(NOW.plus(Duration.ofMinutes(30)));
    token.setCreatedAt(NOW.minus(Duration.ofMinutes(5)));
    return token;
  }

  private User unverifiedUser() {
    User user = new User();
    user.setId(UUID.randomUUID());
    user.setEmail("player@example.com");
    user.setUsername("player");
    user.setPasswordHash("hashed-password");
    user.setRole(UserRole.USER);
    user.setEmailVerified(false);
    user.setEnabled(true);
    user.setDeleted(false);
    user.setTokenValidFrom(Instant.EPOCH);
    return user;
  }

  private String hash(String rawToken) {
    return Sha256Hasher.hashHex(rawToken);
  }
}
