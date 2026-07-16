package org.coderacer.backend.user.verification;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.regex.Pattern;
import org.coderacer.backend.common.crypto.Sha256Hasher;
import org.coderacer.backend.email.CapturingEmailSender;
import org.coderacer.backend.email.EmailMessage;
import org.coderacer.backend.support.IntegrationTest;
import org.coderacer.backend.user.model.User;
import org.coderacer.backend.user.model.UserRole;
import org.coderacer.backend.user.repository.UserRepository;
import org.coderacer.backend.user.verification.model.EmailVerificationToken;
import org.coderacer.backend.user.verification.repository.EmailVerificationTokenRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.TestRestTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;

@IntegrationTest
class EmailVerificationIntegrationTest {

  private static final Pattern TOKEN_PATTERN = Pattern.compile("token=([^\\s]+)");

  @Autowired private TestRestTemplate restTemplate;
  @Autowired private CapturingEmailSender emailSender;
  @Autowired private UserRepository userRepository;
  @Autowired private EmailVerificationTokenRepository tokenRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  @BeforeEach
  void setUp() {
    tokenRepository.deleteAll();
    userRepository.deleteAll();
    emailSender.clear();
  }

  @AfterEach
  void tearDown() {
    tokenRepository.deleteAll();
    userRepository.deleteAll();
    emailSender.clear();
  }

  @Test
  void registrationSendsVerificationEmailAndStoresOnlyHashedToken() {
    ResponseEntity<String> response = register("player@example.com", "speed_racer");

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
    String rawToken = extractToken(awaitSingleEmail().text());
    EmailVerificationToken savedToken = tokenRepository.findAll().getFirst();
    User savedUser = userRepository.findByEmail("player@example.com").orElseThrow();

    assertThat(savedUser.isEmailVerified()).isFalse();
    assertThat(savedToken.getUser().getId()).isEqualTo(savedUser.getId());
    assertThat(savedToken.getTokenHash()).isEqualTo(hash(rawToken));
    assertThat(savedToken.getTokenHash()).doesNotContain(rawToken);
    assertThat(savedToken.getExpiresAt()).isAfter(Instant.now());
  }

  @Test
  void validVerificationTokenVerifiesOnceAndAllowsLogin() {
    register("player@example.com", "speed_racer");
    String rawToken = extractToken(awaitSingleEmail().text());

    ResponseEntity<String> loginBeforeVerification = login("speed_racer", "StrongerPass123");
    ResponseEntity<String> verificationResponse = confirm(rawToken);
    ResponseEntity<String> reusedTokenResponse = confirm(rawToken);
    ResponseEntity<String> loginAfterVerification = login("speed_racer", "StrongerPass123");
    ResponseEntity<String> emailLoginAfterVerification =
        login("player@example.com", "StrongerPass123");

    User savedUser = userRepository.findByEmail("player@example.com").orElseThrow();
    assertThat(loginBeforeVerification.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    assertThat(verificationResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
    assertThat(reusedTokenResponse.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    assertThat(loginAfterVerification.getStatusCode()).isEqualTo(HttpStatus.OK);
    assertThat(emailLoginAfterVerification.getStatusCode()).isEqualTo(HttpStatus.OK);
    assertThat(savedUser.isEmailVerified()).isTrue();
  }

  @Test
  void invalidExpiredAndReplacedTokensFailSafely() {
    User user = saveUser("player@example.com", "speed_racer");
    saveToken(user, "expired-token", Instant.now().minusSeconds(5));

    ResponseEntity<String> invalidTokenResponse = confirm("missing-token");
    ResponseEntity<String> expiredTokenResponse = confirm("expired-token");

    assertThat(invalidTokenResponse.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    assertThat(expiredTokenResponse.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    assertThat(userRepository.findById(user.getId()).orElseThrow().isEmailVerified()).isFalse();
  }

  @Test
  void resendUsesNeutralResponseAndRevokesPreviousActiveToken() {
    register("player@example.com", "speed_racer");
    String firstToken = extractToken(awaitSingleEmail().text());
    emailSender.clear();

    ResponseEntity<String> resendResponse =
        restTemplate.postForEntity(
            "/api/auth/email-verification/resend",
            Map.of("email", "Player@Example.COM"),
            String.class);

    assertThat(resendResponse.getStatusCode()).isEqualTo(HttpStatus.ACCEPTED);
    assertThat(resendResponse.getBody())
        .contains("If an unverified account exists, a verification email will be sent.");
    String replacementToken = extractToken(awaitSingleEmail().text());

    assertThat(confirm(firstToken).getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    assertThat(confirm(replacementToken).getStatusCode()).isEqualTo(HttpStatus.OK);
  }

  @Test
  void resendDoesNotRevealUnknownOrAlreadyVerifiedAccounts() {
    User verified = saveUser("verified@example.com", "verified");
    verified.setEmailVerified(true);
    userRepository.saveAndFlush(verified);

    ResponseEntity<String> unknownResponse =
        restTemplate.postForEntity(
            "/api/auth/email-verification/resend",
            Map.of("email", "missing@example.com"),
            String.class);
    ResponseEntity<String> verifiedResponse =
        restTemplate.postForEntity(
            "/api/auth/email-verification/resend",
            Map.of("email", "verified@example.com"),
            String.class);

    assertThat(unknownResponse.getStatusCode()).isEqualTo(HttpStatus.ACCEPTED);
    assertThat(verifiedResponse.getStatusCode()).isEqualTo(HttpStatus.ACCEPTED);
    assertThat(emailSender.sentMessages()).isEmpty();
  }

  private ResponseEntity<String> register(String email, String username) {
    return restTemplate.postForEntity(
        "/api/auth/register",
        Map.of(
            "email",
            email,
            "username",
            username,
            "password",
            "StrongerPass123",
            "confirmPassword",
            "StrongerPass123"),
        String.class);
  }

  private ResponseEntity<String> confirm(String token) {
    return restTemplate.postForEntity(
        "/api/auth/email-verification/confirm", Map.of("token", token), String.class);
  }

  private ResponseEntity<String> login(String identifier, String password) {
    return restTemplate.postForEntity(
        "/api/auth/login", Map.of("identifier", identifier, "password", password), String.class);
  }

  private User saveUser(String email, String username) {
    User user = new User();
    user.setEmail(email);
    user.setUsername(username);
    user.setPasswordHash(passwordEncoder.encode("StrongerPass123"));
    user.setRole(UserRole.USER);
    user.setEmailVerified(false);
    user.setEnabled(true);
    user.setDeleted(false);
    user.setTokenValidFrom(Instant.EPOCH);
    return userRepository.saveAndFlush(user);
  }

  private void saveToken(User user, String rawToken, Instant expiresAt) {
    EmailVerificationToken token = new EmailVerificationToken();
    token.setUser(user);
    token.setTokenHash(hash(rawToken));
    token.setExpiresAt(expiresAt);
    tokenRepository.saveAndFlush(token);
  }

  private String extractToken(String emailText) {
    var matcher = TOKEN_PATTERN.matcher(emailText);
    assertThat(matcher.find()).isTrue();
    return matcher.group(1);
  }

  private EmailMessage awaitSingleEmail() {
    await()
        .atMost(Duration.ofSeconds(3))
        .untilAsserted(() -> assertThat(emailSender.sentMessages()).hasSize(1));
    return emailSender.sentMessages().getFirst();
  }

  private String hash(String rawToken) {
    return Sha256Hasher.hashHex(rawToken);
  }
}
