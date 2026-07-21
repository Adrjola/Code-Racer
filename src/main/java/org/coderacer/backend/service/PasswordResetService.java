package org.coderacer.backend.service;

import jakarta.transaction.Transactional;
import java.time.Clock;
import java.time.Instant;
import lombok.RequiredArgsConstructor;
import org.coderacer.backend.config.properties.PasswordResetProperties;
import org.coderacer.backend.dto.ForgotPasswordRequest;
import org.coderacer.backend.dto.ForgotPasswordResponse;
import org.coderacer.backend.model.PasswordResetToken;
import org.coderacer.backend.model.User;
import org.coderacer.backend.repository.PasswordResetTokenRepository;
import org.coderacer.backend.repository.UserRepository;
import org.coderacer.backend.util.Sha256Hasher;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class PasswordResetService {

  private final PasswordResetTokenRepository tokenRepository;
  private final UserRepository userRepository;
  private final SecureTokenGenerator tokenGenerator;
  private final PasswordResetProperties properties;
  private final ApplicationEventPublisher eventPublisher;
  private final Clock clock;

  @Transactional
  public ForgotPasswordResponse requestReset(ForgotPasswordRequest request) {
    String email = normalize(request.email());
    Instant now = clock.instant();

    userRepository
        .findByEmailForUpdate(email)
        .filter(User::canAuthenticate)
        .ifPresent(user -> replaceAndPublishToken(user, now));

    return ForgotPasswordResponse.accepted();
  }

  private void replaceAndPublishToken(User user, Instant now) {
    tokenRepository.revokeActiveTokensForUser(user, now);
    createAndPublishToken(user, now);
  }

  private void createAndPublishToken(User user, Instant now) {
    String rawToken = tokenGenerator.generate();
    String hashedToken = Sha256Hasher.hash(rawToken);
    Instant expiresAt = now.plus(properties.tokenTtl());
    PasswordResetToken token = new PasswordResetToken(user, hashedToken, expiresAt);
    tokenRepository.save(token);

    eventPublisher.publishEvent(
        new PasswordResetRequestedEvent(user.getEmail(), rawToken, expiresAt));
  }

  private String normalize(String email) {
    return email.trim().toLowerCase();
  }
}
