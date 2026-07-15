package org.coderacer.backend.security.jwt;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.coderacer.backend.user.model.User;
import org.coderacer.backend.user.repository.UserRepository;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class JwtAccountValidator implements OAuth2TokenValidator<Jwt> {

  private static final OAuth2Error INVALID_TOKEN =
      new OAuth2Error("invalid_token", "Token is invalid or no longer active", null);

  private final UserRepository repository;

  @Override
  public OAuth2TokenValidatorResult validate(Jwt token) {
    String username = token.getSubject();
    if (username == null || username.isBlank()) {
      return OAuth2TokenValidatorResult.failure(INVALID_TOKEN);
    }

    return repository
        .findByUsername(username)
        .filter(this::canAuthenticate)
        .filter(user -> tokenRoleMatchesUser(token, user))
        .filter(user -> tokenValidFromMatchesUser(token, user))
        .map(user -> OAuth2TokenValidatorResult.success())
        .orElseGet(() -> OAuth2TokenValidatorResult.failure(INVALID_TOKEN));
  }

  private boolean canAuthenticate(User user) {
    return user.isEmailVerified() && user.isEnabled() && !user.isDeleted();
  }

  private boolean tokenRoleMatchesUser(Jwt token, User user) {
    List<String> roles = token.getClaimAsStringList("roles");
    return roles != null && roles.contains(user.getRole().name());
  }

  private boolean tokenValidFromMatchesUser(Jwt token, User user) {
    Object tokenValidFrom = token.getClaims().get("tokenValidFrom");
    return tokenValidFrom instanceof Number value
        && value.longValue() == user.getTokenValidFrom().toEpochMilli();
  }
}
