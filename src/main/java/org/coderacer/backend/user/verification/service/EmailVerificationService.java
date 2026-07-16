package org.coderacer.backend.user.verification.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.coderacer.backend.user.dto.UserResponse;
import org.coderacer.backend.user.mapper.UserMapper;
import org.coderacer.backend.user.model.User;
import org.coderacer.backend.user.repository.UserRepository;
import org.coderacer.backend.user.verification.config.EmailVerificationProperties;
import org.coderacer.backend.user.verification.dto.EmailVerificationConfirmRequest;
import org.coderacer.backend.user.verification.dto.EmailVerificationResendRequest;
import org.coderacer.backend.user.verification.dto.EmailVerificationResendResponse;
import org.coderacer.backend.user.verification.exception.EmailVerificationFailedException;
import org.coderacer.backend.user.verification.model.EmailVerificationToken;
import org.coderacer.backend.user.verification.repository.EmailVerificationTokenRepository;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.UriComponentsBuilder;

@Service
@RequiredArgsConstructor
public class EmailVerificationService {

  private final EmailVerificationTokenRepository tokenRepository;
  private final UserRepository userRepository;
  private final EmailVerificationTokenGenerator tokenGenerator;
  private final EmailVerificationProperties properties;
  private final ApplicationEventPublisher eventPublisher;
  private final UserMapper userMapper;
  private final Clock clock;

  @Transactional
  public void sendVerificationEmail(User user) {
    if (user.isEmailVerified() || !user.isEnabled() || user.isDeleted()) {
      return;
    }

    createAndPublishToken(user, clock.instant());
  }

  @Transactional
  public UserResponse confirm(EmailVerificationConfirmRequest request) {
    Instant now = clock.instant();
    EmailVerificationToken token = findUsableToken(request.token(), now);
    User user = token.getUser();
    if (user.isDeleted()) {
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
        .findByEmail(normalize(request.email()))
        .filter(user -> !user.isEmailVerified())
        .filter(user -> user.isEnabled() && !user.isDeleted())
        .filter(user -> resendCooldownElapsed(user, now))
        .ifPresent(user -> createAndPublishToken(user, now));

    return EmailVerificationResendResponse.accepted();
  }

  private EmailVerificationToken findUsableToken(String rawToken, Instant now) {
    String token = rawToken == null ? "" : rawToken.trim();
    if (token.isBlank()) {
      throw new EmailVerificationFailedException();
    }

    return tokenRepository
        .findByTokenHash(hashToken(token))
        .filter(candidate -> candidate.isUsable(now))
        .orElseThrow(EmailVerificationFailedException::new);
  }

  private void createAndPublishToken(User user, Instant now) {
    tokenRepository.revokeActiveTokensForUser(user, now);

    String rawToken = tokenGenerator.generate();
    EmailVerificationToken token = new EmailVerificationToken();
    token.setUser(user);
    token.setTokenHash(hashToken(rawToken));
    token.setExpiresAt(now.plus(properties.tokenTtl()));
    tokenRepository.save(token);

    eventPublisher.publishEvent(
        new EmailVerificationRequestedEvent(
            user.getId(),
            user.getEmail(),
            user.getUsername(),
            verificationLink(rawToken),
            token.getExpiresAt()));
  }

  private boolean resendCooldownElapsed(User user, Instant now) {
    if (properties.resendCooldown().isZero()) {
      return true;
    }

    return tokenRepository
        .findFirstByUserOrderByCreatedAtDesc(user)
        .map(EmailVerificationToken::getCreatedAt)
        .map(createdAt -> !createdAt.plus(properties.resendCooldown()).isAfter(now))
        .orElse(true);
  }

  private String verificationLink(String rawToken) {
    return UriComponentsBuilder.fromUriString(properties.verificationUrl())
        .queryParam("token", rawToken)
        .build()
        .toUriString();
  }

  private String hashToken(String rawToken) {
    try {
      MessageDigest digest = MessageDigest.getInstance("SHA-256");
      byte[] hash = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
      return HexFormat.of().formatHex(hash);
    } catch (NoSuchAlgorithmException ex) {
      throw new IllegalStateException("SHA-256 is not available", ex);
    }
  }

  private String normalize(String value) {
    return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
  }
}
