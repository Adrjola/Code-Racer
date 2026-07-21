package org.coderacer.backend.service;

import java.time.Clock;
import java.time.Instant;
import lombok.RequiredArgsConstructor;
import org.coderacer.backend.config.properties.EmailVerificationProperties;
import org.coderacer.backend.dto.EmailVerificationConfirmRequest;
import org.coderacer.backend.dto.EmailVerificationResendRequest;
import org.coderacer.backend.dto.EmailVerificationResendResponse;
import org.coderacer.backend.dto.UserResponse;
import org.coderacer.backend.exception.EmailVerificationFailedException;
import org.coderacer.backend.mapper.UserMapper;
import org.coderacer.backend.model.EmailVerificationToken;
import org.coderacer.backend.model.User;
import org.coderacer.backend.repository.EmailVerificationTokenRepository;
import org.coderacer.backend.repository.UserRepository;
import org.coderacer.backend.util.Sha256Hasher;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class EmailVerificationService {

  private final EmailVerificationTokenRepository tokenRepository;
  private final UserRepository userRepository;
  private final SecureTokenGenerator tokenGenerator;
  private final EmailVerificationProperties properties;
  private final ApplicationEventPublisher eventPublisher;
  private final UserMapper userMapper;
  private final Clock clock;

  @Transactional
  public void sendInitialVerificationEmail(User user) {
    if (!user.canVerifyEmail()) {
      return;
    }

    createAndPublishToken(user, clock.instant());
  }

  @Transactional
  public UserResponse confirm(EmailVerificationConfirmRequest request) {
    Instant now = clock.instant();
    EmailVerificationToken token = findUsableToken(request.token(), now);
    User user = token.getUser();
    if (!user.canVerifyEmail()) {
      throw new EmailVerificationFailedException();
    }

    user.setEmailVerified(true);
    token.markUsed(now);
    tokenRepository.revokeOtherActiveTokensForUser(user, token.getId(), now);

    return userMapper.toResponse(user);
  }

  @Transactional
  public EmailVerificationResendResponse resend(EmailVerificationResendRequest request) {
    Instant now = clock.instant();
    userRepository
        .findByEmailForUpdate(normalize(request.email()))
        .filter(User::canVerifyEmail)
        .filter(user -> user.canResendVerificationEmail(now, properties.resendCooldown()))
        .ifPresent(user -> replaceAndPublishToken(user, now));

    return EmailVerificationResendResponse.accepted();
  }

  private EmailVerificationToken findUsableToken(String rawToken, Instant now) {
    String token = rawToken == null ? "" : rawToken.trim();
    if (token.isBlank()) {
      throw new EmailVerificationFailedException();
    }

    return tokenRepository
        .findByTokenHashForUpdate(Sha256Hasher.hash(token))
        .filter(candidate -> candidate.isUsable(now))
        .orElseThrow(EmailVerificationFailedException::new);
  }

  private void replaceAndPublishToken(User user, Instant now) {
    tokenRepository.revokeActiveTokensForUser(user, now);
    user.markVerificationEmailResent(now);
    createAndPublishToken(user, now);
  }

  private void createAndPublishToken(User user, Instant now) {
    String rawToken = tokenGenerator.generate();
    String hashedToken = Sha256Hasher.hash(rawToken);
    Instant expiresAt = now.plus(properties.tokenTtl());
    EmailVerificationToken token = new EmailVerificationToken(user, hashedToken, expiresAt);
    tokenRepository.save(token);

    eventPublisher.publishEvent(
        new EmailVerificationRequestedEvent(user.getEmail(), rawToken, expiresAt));
  }

  private String normalize(String value) {
    return value.trim().toLowerCase();
  }
}
