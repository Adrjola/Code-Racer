package org.coderacer.backend.service;

import java.time.Clock;
import java.time.Instant;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.coderacer.backend.exception.ResourceNotFoundException;
import org.coderacer.backend.model.User;
import org.coderacer.backend.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class TokenInvalidationService {

  private final UserRepository userRepository;
  private final Clock clock;

  @Transactional
  public Instant invalidateTokensForPasswordReset(UUID userId) {
    User user =
        userRepository
            .findById(userId)
            .orElseThrow(
                () -> new ResourceNotFoundException("User with id " + userId + " not found"));
    Instant tokenValidFrom = Instant.now(clock);
    user.setTokenValidFrom(tokenValidFrom);
    userRepository.save(user);
    return tokenValidFrom;
  }
}
