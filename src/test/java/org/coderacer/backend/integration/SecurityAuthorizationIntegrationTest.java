package org.coderacer.backend.integration;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import org.coderacer.backend.dto.CreateSnippetRequest;
import org.coderacer.backend.enums.Category;
import org.coderacer.backend.enums.Difficulty;
import org.coderacer.backend.enums.UserRole;
import org.coderacer.backend.model.User;
import org.coderacer.backend.repository.CodeSnippetRepository;
import org.coderacer.backend.repository.UserRepository;
import org.coderacer.backend.security.JwtService;
import org.coderacer.backend.service.SnippetService;
import org.coderacer.backend.service.TokenInvalidationService;
import org.coderacer.backend.support.IntegrationTest;
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
  @Autowired private CodeSnippetRepository snippetRepository;
  @Autowired private SnippetService snippetService;
  @Autowired private PasswordEncoder passwordEncoder;
  @Autowired private JwtService jwtService;
  @Autowired private TokenInvalidationService tokenInvalidationService;

  @BeforeEach
  void setUp() {
    snippetRepository.deleteAll();
    userRepository.deleteAll();
  }

  @AfterEach
  void tearDown() {
    snippetRepository.deleteAll();
    userRepository.deleteAll();
  }

  @Test
  void publicCategoryReadIsAccessibleWithoutToken() {
    ResponseEntity<String> response = restTemplate.getForEntity("/api/categories", String.class);

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
  }

  @Test
  void adminSnippetsRouteRequiresAuthentication() {
    ResponseEntity<String> response =
        restTemplate.getForEntity("/api/admin/snippets", String.class);

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    assertThat(response.getBody()).contains("\"code\":\"AUTHENTICATION_REQUIRED\"");
  }

  @Test
  void userTokenCannotAccessAdminSnippetsRoute() {
    User user = saveUser("player", UserRole.USER);

    ResponseEntity<String> response =
        restTemplate.exchange(
            "/api/admin/snippets",
            HttpMethod.GET,
            bearerEntity(jwtService.createAccessToken(user)),
            String.class);

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    assertThat(response.getBody()).contains("\"code\":\"ACCESS_DENIED\"");
  }

  @Test
  void adminTokenCanAccessAdminSnippetsRoute() {
    User admin = saveUser("admin", UserRole.ADMIN);

    ResponseEntity<String> response =
        restTemplate.exchange(
            "/api/admin/snippets",
            HttpMethod.GET,
            bearerEntity(jwtService.createAccessToken(admin)),
            String.class);

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
  }

  @Test
  void snippetRandomRouteRequiresAuthentication() {
    ResponseEntity<String> response =
        restTemplate.getForEntity("/api/snippets/random", String.class);

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    assertThat(response.getBody()).contains("\"code\":\"AUTHENTICATION_REQUIRED\"");
  }

  @Test
  void userTokenCanAccessRandomSnippetRoute() {
    User user = saveUser("snippet_player", UserRole.USER);
    snippetService.create(
        new CreateSnippetRequest("FizzBuzz", "class Main {}", Difficulty.EASY, Category.JAVA));

    ResponseEntity<String> response =
        restTemplate.exchange(
            "/api/snippets/random?category=" + Category.JAVA + "&difficulty=EASY",
            HttpMethod.GET,
            bearerEntity(jwtService.createAccessToken(user)),
            String.class);

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    assertThat(response.getBody()).contains("\"source\":\"class Main {}\"");
  }

  @Test
  void userTokenCannotAccessAdminSnippetRoute() {
    User user = saveUser("snippet_reviewer", UserRole.USER);

    ResponseEntity<String> response =
        restTemplate.exchange(
            "/api/admin/snippets",
            HttpMethod.GET,
            bearerEntity(jwtService.createAccessToken(user)),
            String.class);

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    assertThat(response.getBody()).contains("\"code\":\"ACCESS_DENIED\"");
  }

  @Test
  void adminTokenCanAccessAdminSnippetRoute() {
    User admin = saveUser("snippet_admin", UserRole.ADMIN);

    ResponseEntity<String> response =
        restTemplate.exchange(
            "/api/admin/snippets",
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
            "/api/admin/snippets",
            HttpMethod.GET,
            bearerEntity(jwtService.createAccessToken(admin)),
            String.class);

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
  }

  @Test
  void userTokenCannotAccessAdminUserRoute() {
    User user = saveUser("user_reviewer", UserRole.USER);

    ResponseEntity<String> response =
        restTemplate.exchange(
            "/api/admin/users",
            HttpMethod.GET,
            bearerEntity(jwtService.createAccessToken(user)),
            String.class);

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    assertThat(response.getBody()).contains("\"code\":\"ACCESS_DENIED\"");
  }

  @Test
  void adminTokenCanAccessAdminUserRoute_andResponseNeverExposesCredentials() {
    User admin = saveUser("user_admin", UserRole.ADMIN);

    ResponseEntity<String> response =
        restTemplate.exchange(
            "/api/admin/users",
            HttpMethod.GET,
            bearerEntity(jwtService.createAccessToken(admin)),
            String.class);

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    assertThat(response.getBody()).contains("\"username\":\"user_admin\"");
    assertThat(response.getBody())
        .doesNotContain("passwordHash")
        .doesNotContain("tokenValidFrom")
        .doesNotContain("verificationEmailResentAt");
  }

  @Test
  void oldTokenCannotAccessProtectedRouteAfterTokenInvalidation() {
    User admin = saveUser("admin", UserRole.ADMIN);
    String oldToken = jwtService.createAccessToken(admin);

    tokenInvalidationService.invalidateTokensForPasswordReset(admin.getId());

    ResponseEntity<String> oldTokenResponse =
        restTemplate.exchange(
            "/api/admin/snippets", HttpMethod.GET, bearerEntity(oldToken), String.class);
    User refreshedAdmin = userRepository.findById(admin.getId()).orElseThrow();
    ResponseEntity<String> newTokenResponse =
        restTemplate.exchange(
            "/api/admin/snippets",
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
    user.setDeleted(false);
    user.setTokenValidFrom(Instant.EPOCH);
    return userRepository.saveAndFlush(user);
  }
}
