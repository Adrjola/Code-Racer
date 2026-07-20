package org.coderacer.backend.security;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.coderacer.backend.config.properties.JwtProperties;
import org.coderacer.backend.model.User;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class JwtService {

  private final JwtEncoder encoder;
  private final JwtProperties properties;
  private final Clock clock;

  public String createAccessToken(User user) {
    Instant issuedAt = Instant.now(clock).truncatedTo(ChronoUnit.SECONDS);
    Instant expiresAt = issuedAt.plus(properties.accessTokenTtl());
    JwtClaimsSet claims =
        JwtClaimsSet.builder()
            .issuer("code-racer-backend")
            .subject(user.getUsername())
            .issuedAt(issuedAt)
            .expiresAt(expiresAt)
            .claim("userId", user.getId().toString())
            .claim("roles", List.of(user.getRole().name()))
            .claim("tokenValidFrom", user.getTokenValidFrom().toEpochMilli())
            .build();
    JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).type("JWT").build();
    return encoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
  }

  public Duration accessTokenTtl() {
    return properties.accessTokenTtl();
  }
}
