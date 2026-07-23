package org.coderacer.backend.integration;

import static org.assertj.core.api.Assertions.assertThat;

import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.List;
import java.util.UUID;
import javax.crypto.SecretKey;
import org.coderacer.backend.enums.UserRole;
import org.coderacer.backend.model.User;
import org.coderacer.backend.repository.UserRepository;
import org.coderacer.backend.support.IntegrationTest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;

@IntegrationTest
class JwtExpiryIntegrationTest {

  @Autowired private TestRestTemplate restTemplate;
  @Autowired private UserRepository userRepository;
  @Autowired private PasswordEncoder passwordEncoder;
  @Autowired private SecretKey jwtSecretKey;

  private UUID savedAdminId;

  @AfterEach
  void tearDown() {
    if (savedAdminId != null) {
      userRepository.deleteById(savedAdminId);
      savedAdminId = null;
    }
  }

  @Test
  void expiredTokenCannotAccessProtectedRoute() throws Exception {
    User admin = saveAdmin();

    ResponseEntity<String> response =
        restTemplate.exchange(
            "/api/admin/snippets",
            HttpMethod.GET,
            bearerEntity(expiredTokenFor(admin)),
            String.class);

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    assertThat(response.getBody()).contains("\"code\":\"AUTHENTICATION_REQUIRED\"");
  }

  private HttpEntity<Void> bearerEntity(String token) {
    HttpHeaders headers = new HttpHeaders();
    headers.setBearerAuth(token);
    return new HttpEntity<>(headers);
  }

  private String expiredTokenFor(User user) throws Exception {
    Instant now = Instant.now();
    JWTClaimsSet claims =
        new JWTClaimsSet.Builder()
            .issuer("code-racer-backend")
            .subject(user.getUsername())
            .issueTime(Date.from(now.minus(Duration.ofMinutes(10))))
            .expirationTime(Date.from(now.minus(Duration.ofMinutes(5))))
            .claim("userId", user.getId().toString())
            .claim("roles", List.of(user.getRole().name()))
            .claim("tokenValidFrom", user.getTokenValidFrom().toEpochMilli())
            .build();
    SignedJWT token = new SignedJWT(new JWSHeader(JWSAlgorithm.HS256), claims);
    token.sign(new MACSigner(jwtSecretKey.getEncoded()));
    return token.serialize();
  }

  private User saveAdmin() {
    String suffix = UUID.randomUUID().toString().substring(0, 8);
    User user = new User();
    user.setEmail("expired-admin-" + suffix + "@example.com");
    user.setUsername("expadmin" + suffix);
    user.setPasswordHash(passwordEncoder.encode("StrongerPass123"));
    user.setRole(UserRole.ADMIN);
    user.setEmailVerified(true);
    user.setDeleted(false);
    user.setTokenValidFrom(Instant.EPOCH);
    User savedUser = userRepository.saveAndFlush(user);
    savedAdminId = savedUser.getId();
    return savedUser;
  }
}
