package org.coderacer.backend.soloattempt.identity;

import jakarta.servlet.http.HttpServletRequest;
import java.util.UUID;
import org.coderacer.backend.soloattempt.exception.MissingCurrentUserException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

@Component
public class JwtCurrentUserProvider implements CurrentUserProvider {

  @Override
  public UUID resolve(HttpServletRequest request) {
    Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
    if (authentication == null || !(authentication.getPrincipal() instanceof Jwt jwt)) {
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
