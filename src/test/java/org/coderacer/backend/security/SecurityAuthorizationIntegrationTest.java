package org.coderacer.backend.security;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import org.coderacer.backend.category.repository.CategoryRepository;
import org.coderacer.backend.security.service.JwtService;
import org.coderacer.backend.security.service.TokenInvalidationService;
import org.coderacer.backend.support.IntegrationTest;
import org.coderacer.backend.user.model.User;
import org.coderacer.backend.user.model.UserRole;
import org.coderacer.backend.user.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
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
class SecurityAuthorizationIntegrationTest {

  @Autowired private TestRestTemplate restTemplate;
  @Autowired private UserRepository userRepository;
  @Autowired private CategoryRepository categoryRepository;
  @Autowired private PasswordEncoder passwordEncoder;
  @Autowired private JwtService jwtService;
  @Autowired private TokenInvalidationService tokenInvalidationService;

  @BeforeEach
  void setUp() {
    categoryRepository.deleteAll();
    userRepository.deleteAll();
  }

  @AfterEach
  void tearDown() {
    categoryRepository.deleteAll();
    userRepository.deleteAll();
  }

  @Test
  void publicCategoryReadIsAccessibleWithoutToken() {
    ResponseEntity<String> response = restTemplate.getForEntity("/api/categories", String.class);

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
  }

  @Test
  void adminCategoryRouteRequiresAuthentication() {
    ResponseEntity<String> response =
        restTemplate.getForEntity("/api/admin/categories", String.class);

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    assertThat(response.getBody()).contains("\"code\":\"AUTHENTICATION_REQUIRED\"");
  }

  @Test
  void userTokenCannotAccessAdminCategoryRoute() {
    User user = saveUser("player", UserRole.USER);

    ResponseEntity<String> response =
        restTemplate.exchange(
            "/api/admin/categories",
            HttpMethod.GET,
            bearerEntity(jwtService.createAccessToken(user)),
            String.class);

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    assertThat(response.getBody()).contains("\"code\":\"ACCESS_DENIED\"");
  }

  @Test
  void adminTokenCanAccessAdminCategoryRoute() {
    User admin = saveUser("admin", UserRole.ADMIN);

    ResponseEntity<String> response =
        restTemplate.exchange(
            "/api/admin/categories",
            HttpMethod.GET,
            bearerEntity(jwtService.createAccessToken(admin)),
            String.class);

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
  }

  @Test
  void unverifiedUserTokenCannotAccessProtectedRoute() {
    User admin = saveUser("admin", UserRole.ADMIN);
    admin.setEmailVerified(false);
    userRepository.saveAndFlush(admin);

    ResponseEntity<String> response =
        restTemplate.exchange(
            "/api/admin/categories",
            HttpMethod.GET,
            bearerEntity(jwtService.createAccessToken(admin)),
            String.class);

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
  }

  @Test
  void oldTokenCannotAccessProtectedRouteAfterTokenInvalidation() {
    User admin = saveUser("admin", UserRole.ADMIN);
    String oldToken = jwtService.createAccessToken(admin);

    tokenInvalidationService.invalidateTokensForPasswordReset(admin.getId());

    ResponseEntity<String> oldTokenResponse =
        restTemplate.exchange(
            "/api/admin/categories", HttpMethod.GET, bearerEntity(oldToken), String.class);
    User refreshedAdmin = userRepository.findById(admin.getId()).orElseThrow();
    ResponseEntity<String> newTokenResponse =
        restTemplate.exchange(
            "/api/admin/categories",
            HttpMethod.GET,
            bearerEntity(jwtService.createAccessToken(refreshedAdmin)),
            String.class);

    assertThat(oldTokenResponse.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    assertThat(newTokenResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
  }

  private HttpEntity<Void> bearerEntity(String token) {
    HttpHeaders headers = new HttpHeaders();
    headers.setBearerAuth(token);
    return new HttpEntity<>(headers);
  }

  private User saveUser(String username, UserRole role) {
    User user = new User();
    user.setEmail(username + "@example.com");
    user.setUsername(username);
    user.setPasswordHash(passwordEncoder.encode("StrongerPass123"));
    user.setRole(role);
    user.setEmailVerified(true);
    user.setEnabled(true);
    user.setDeleted(false);
    user.setTokenValidAfter(Instant.EPOCH);
    return userRepository.saveAndFlush(user);
  }
}
