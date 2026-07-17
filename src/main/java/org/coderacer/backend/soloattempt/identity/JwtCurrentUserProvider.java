package org.coderacer.backend.soloattempt.identity;

import jakarta.servlet.http.HttpServletRequest;
import java.util.UUID;
import org.coderacer.backend.soloattempt.exception.MissingCurrentUserException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

@Component
public class JwtCurrentUserProvider implements CurrentUserProvider {

  private static final UUID TEST_USER_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");
  private final boolean allowUnauthenticatedSoloAttempts;

  public JwtCurrentUserProvider(
      @Value("${app.solo-attempt.allow-unauthenticated:false}")
          boolean allowUnauthenticatedSoloAttempts) {
    this.allowUnauthenticatedSoloAttempts = allowUnauthenticatedSoloAttempts;
  }

  @Override
  public UUID resolve(HttpServletRequest request) {
    Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
    if (authentication == null || !(authentication.getPrincipal() instanceof Jwt jwt)) {
      if (allowUnauthenticatedSoloAttempts) {
        return TEST_USER_ID;
      }
      throw new MissingCurrentUserException("No authenticated JWT principal present");
    }
    String userId = jwt.getClaimAsString("userId");
    if (userId == null || userId.isBlank()) {
      throw new MissingCurrentUserException("JWT is missing required claim: userId");
    }
    try {
      return UUID.fromString(userId);
    } catch (IllegalArgumentException e) {
      throw new MissingCurrentUserException("JWT userId claim is not a valid UUID");
    }
  }
}
