package org.coderacer.backend.security;

import java.util.UUID;
import org.coderacer.backend.exception.MissingCurrentUserException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

@Component
public class CurrentJwtUserProvider {

  public UUID resolve() {
    Jwt jwt = currentJwt();
    return userIdFrom(jwt);
  }

  private Jwt currentJwt() {
    Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

    if (authentication == null || !(authentication.getPrincipal() instanceof Jwt jwt)) {
      throw new MissingCurrentUserException("No authenticated JWT principal present");
    }

    return jwt;
  }

  private UUID userIdFrom(Jwt jwt) {
    String userId = jwt.getClaimAsString("userId");

    if (userId == null || userId.isBlank()) {
      throw new MissingCurrentUserException("JWT is missing required claim: userId");
    }

    try {
      return UUID.fromString(userId);
    } catch (IllegalArgumentException ex) {
      throw new MissingCurrentUserException("JWT userId claim is not a valid UUID");
    }
  }
}
