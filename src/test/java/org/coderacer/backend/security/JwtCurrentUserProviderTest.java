package org.coderacer.backend.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import org.coderacer.backend.exception.MissingCurrentUserException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

class JwtCurrentUserProviderTest {

  private final JwtCurrentUserProvider provider = new JwtCurrentUserProvider();
  private final HttpServletRequest request = null;

  @AfterEach
  void clearSecurityContext() {
    SecurityContextHolder.clearContext();
  }

  private Jwt jwtWithClaims(Map<String, Object> claims) {
    return Jwt.withTokenValue("token")
        .header("alg", "none")
        .claims(c -> c.putAll(claims))
        .issuedAt(Instant.EPOCH)
        .expiresAt(Instant.EPOCH.plusSeconds(60))
        .build();
  }

  @Test
  void resolvesUserIdFromJwtClaim() {
    UUID userId = UUID.randomUUID();
    Jwt jwt = jwtWithClaims(Map.of("userId", userId.toString()));
    SecurityContextHolder.getContext().setAuthentication(new JwtAuthenticationToken(jwt));

    assertThat(provider.resolve(request)).isEqualTo(userId);
  }

  @Test
  void rejectsMissingAuthentication() {
    SecurityContextHolder.clearContext();

    assertThrows(MissingCurrentUserException.class, () -> provider.resolve(request));
  }

  @Test
  void rejectsNonJwtPrincipal() {
    SecurityContextHolder.getContext()
        .setAuthentication(new TestingAuthenticationToken("someone", "credentials"));

    assertThrows(MissingCurrentUserException.class, () -> provider.resolve(request));
  }

  @Test
  void rejectsMissingUserIdClaim() {
    Jwt jwt = jwtWithClaims(Map.of("sub", "someone"));
    SecurityContextHolder.getContext().setAuthentication(new JwtAuthenticationToken(jwt));

    assertThrows(MissingCurrentUserException.class, () -> provider.resolve(request));
  }

  @Test
  void rejectsInvalidUuidClaim() {
    Jwt jwt = jwtWithClaims(Map.of("userId", "not-a-uuid"));
    SecurityContextHolder.getContext().setAuthentication(new JwtAuthenticationToken(jwt));

    assertThrows(MissingCurrentUserException.class, () -> provider.resolve(request));
  }
}
