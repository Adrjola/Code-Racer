package org.coderacer.backend.security;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.coderacer.backend.model.User;
import org.coderacer.backend.repository.UserRepository;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class JwtUserStatusValidator implements OAuth2TokenValidator<Jwt> {

  private static final OAuth2Error INVALID_TOKEN =
      new OAuth2Error("invalid_token", "Token is invalid or no longer active", null);

  private final UserRepository userRepository;

  @Override
  public OAuth2TokenValidatorResult validate(Jwt token) {
    String username = token.getSubject();
    if (username == null || username.isBlank()) {
      return OAuth2TokenValidatorResult.failure(INVALID_TOKEN);
    }

    return userRepository
        .findByUsername(username)
        .filter(User::canAuthenticate)
        .filter(user -> tokenRoleMatchesUser(token, user))
        .filter(user -> tokenValidFromMatchesUser(token, user))
        .map(user -> OAuth2TokenValidatorResult.success())
        .orElseGet(() -> OAuth2TokenValidatorResult.failure(INVALID_TOKEN));
  }

  private boolean tokenRoleMatchesUser(Jwt token, User user) {
    List<String> roles = token.getClaimAsStringList(JwtTokenService.ROLES_CLAIM);
    return roles != null && roles.contains(user.getRole().name());
  }

  private boolean tokenValidFromMatchesUser(Jwt token, User user) {
    Object tokenValidFrom = token.getClaims().get(JwtTokenService.TOKEN_VALID_FROM_CLAIM);
    return tokenValidFrom instanceof Number value
        && value.longValue() == user.getTokenValidFrom().toEpochMilli();
  }
}
