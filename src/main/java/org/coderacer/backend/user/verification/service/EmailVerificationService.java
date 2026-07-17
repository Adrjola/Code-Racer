package org.coderacer.backend.user.verification.service;

import java.time.Clock;
import java.time.Instant;
import lombok.RequiredArgsConstructor;
import org.coderacer.backend.common.crypto.Sha256Hasher;
import org.coderacer.backend.common.text.IdentifierNormalizer;
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
        .findByTokenHashForUpdate(Sha256Hasher.hashHex(token))
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
    EmailVerificationToken token = new EmailVerificationToken();
    token.setUser(user);
    token.setTokenHash(Sha256Hasher.hashHex(rawToken));
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

  private String verificationLink(String rawToken) {
    return UriComponentsBuilder.fromUriString(properties.verificationUrl())
        .queryParam("token", rawToken)
        .build()
        .toUriString();
  }

  private String normalize(String value) {
    return IdentifierNormalizer.normalize(value);
  }
}
