package org.coderacer.backend.auth.service;

import lombok.RequiredArgsConstructor;
import org.coderacer.backend.auth.dto.LoginRequest;
import org.coderacer.backend.auth.dto.LoginResponse;
import org.coderacer.backend.auth.exception.AuthenticationFailedException;
import org.coderacer.backend.common.text.IdentifierNormalizer;
import org.coderacer.backend.security.jwt.JwtService;
import org.coderacer.backend.user.mapper.UserMapper;
import org.coderacer.backend.user.model.User;
import org.coderacer.backend.user.repository.UserRepository;
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
    var userCandidate = repository.findByEmailOrUsername(identifier, identifier);
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
