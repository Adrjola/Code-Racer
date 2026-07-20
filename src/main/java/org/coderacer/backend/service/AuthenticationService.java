package org.coderacer.backend.service;

import lombok.RequiredArgsConstructor;
import org.coderacer.backend.dto.LoginRequest;
import org.coderacer.backend.dto.LoginResponse;
import org.coderacer.backend.exception.AuthenticationFailedException;
import org.coderacer.backend.mapper.UserMapper;
import org.coderacer.backend.model.User;
import org.coderacer.backend.repository.UserRepository;
import org.coderacer.backend.security.JwtService;
import org.coderacer.backend.util.IdentifierNormalizer;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthenticationService {

  private static final String TOKEN_TYPE = "Bearer";
  private static final String DUMMY_PASSWORD_HASH =
      "$2a$12$C6UzMDM.H6dfI/f/IKcEeO5.6.p5bL/sR7ZI86c0C2t4h8W2cC9rK";

  private final UserRepository repository;
  private final PasswordEncoder passwordEncoder;
  private final JwtService jwtService;
  private final UserMapper userMapper;
  private final LoginAttemptService loginAttemptService;

  @Transactional(readOnly = true)
  public LoginResponse login(LoginRequest request, String clientAddress) {
    String identifier = normalize(request.identifier());
    var userCandidate = repository.findByEmailOrUsernameNormalized(identifier, identifier);
    String attemptKey = loginAttemptKey(identifier, userCandidate.orElse(null));
    loginAttemptService.assertAllowed(attemptKey, clientAddress);

    String passwordHash = userCandidate.map(User::getPasswordHash).orElse(DUMMY_PASSWORD_HASH);
    boolean passwordMatches =
        passwordEncoder.matches(normalizePassword(request.password()), passwordHash);
    User user = userCandidate.filter(User::canAuthenticate).orElse(null);

    if (user == null || !passwordMatches) {
      loginAttemptService.recordFailure(attemptKey, clientAddress);
      throw new AuthenticationFailedException();
    }

    loginAttemptService.recordSuccess(attemptKey, clientAddress);
    return new LoginResponse(
        jwtService.createAccessToken(user),
        TOKEN_TYPE,
        jwtService.accessTokenTtl().toSeconds(),
        userMapper.toResponse(user));
  }

  private String loginAttemptKey(String identifier, User user) {
    if (user == null || user.getId() == null) {
      return identifier;
    }
    return user.getId().toString();
  }

  private String normalize(String value) {
    return IdentifierNormalizer.normalize(value);
  }

  private String normalizePassword(String value) {
    return value == null ? "" : value;
  }
}
