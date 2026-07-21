package org.coderacer.backend.service;

import java.time.Clock;
import java.time.Instant;
import lombok.RequiredArgsConstructor;
import org.coderacer.backend.config.properties.PasswordResetProperties;
import org.coderacer.backend.dto.ForgotPasswordRequest;
import org.coderacer.backend.dto.ForgotPasswordResponse;
import org.coderacer.backend.dto.ResetPasswordRequest;
import org.coderacer.backend.exception.PasswordResetFailedException;
import org.coderacer.backend.exception.ValidationException;
import org.coderacer.backend.model.PasswordResetToken;
import org.coderacer.backend.model.User;
import org.coderacer.backend.repository.PasswordResetTokenRepository;
import org.coderacer.backend.repository.UserRepository;
import org.coderacer.backend.util.Sha256Hasher;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PasswordResetService {

  private final PasswordResetTokenRepository tokenRepository;
  private final UserRepository userRepository;
  private final SecureTokenGenerator tokenGenerator;
  private final PasswordResetProperties properties;
  private final ApplicationEventPublisher eventPublisher;
  private final PasswordEncoder passwordEncoder;
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

  private PasswordResetToken findUsableToken(String rawToken, Instant now) {
    return tokenRepository
        .findByTokenHashForUpdate(Sha256Hasher.hash(rawToken.trim()))
        .filter(candidate -> candidate.isUsable(now))
        .orElseThrow(PasswordResetFailedException::new);
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

  @Transactional
  public void resetPassword(ResetPasswordRequest request) {
    validatePasswordsMatch(request);

    Instant now = clock.instant();
    PasswordResetToken token = findUsableToken(request.token(), now);
    User user = token.getUser();

    if (!user.canAuthenticate()) {
      throw new PasswordResetFailedException();
    }

    user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
    user.setTokenValidFrom(now);
    token.markUsed(now);
    tokenRepository.revokeOtherActiveTokensForUser(user, token.getId(), now);
  }

  private void validatePasswordsMatch(ResetPasswordRequest request) {
    if (!request.newPassword().equals(request.confirmPassword())) {
      throw new ValidationException("Validation failed: confirmPassword must match newPassword");
    }
  }

  private String normalize(String email) {
    return email.trim().toLowerCase();
  }
}
