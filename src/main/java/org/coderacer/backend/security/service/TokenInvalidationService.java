package org.coderacer.backend.security.service;

import java.time.Clock;
import java.time.Instant;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.coderacer.backend.common.exception.ResourceNotFoundException;
import org.coderacer.backend.user.model.User;
import org.coderacer.backend.user.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class TokenInvalidationService {

  private final UserRepository repository;
  private final Clock clock;

  @Transactional
  public Instant invalidateTokensForPasswordReset(UUID userId) {
    User user =
        repository
            .findById(userId)
            .orElseThrow(
                () -> new ResourceNotFoundException("User with id " + userId + " not found"));
    Instant tokenValidAfter = Instant.now(clock);
    user.setTokenValidAfter(tokenValidAfter);
    repository.save(user);
    return tokenValidAfter;
  }
}
