package org.coderacer.backend.auth.service;

import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.coderacer.backend.auth.dto.LoginRequest;
import org.coderacer.backend.auth.dto.LoginResponse;
import org.coderacer.backend.auth.exception.AuthenticationFailedException;
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

  private final UserRepository repository;
  private final PasswordEncoder passwordEncoder;
  private final JwtService jwtService;
  private final UserMapper userMapper;

  @Transactional(readOnly = true)
  public LoginResponse login(LoginRequest request) {
    String username = normalize(request.username());
    User user =
        repository
            .findByUsername(username)
            .filter(this::canAuthenticate)
            .orElseThrow(AuthenticationFailedException::new);

    if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
      throw new AuthenticationFailedException();
    }

    return new LoginResponse(
        jwtService.createAccessToken(user),
        TOKEN_TYPE,
        jwtService.accessTokenTtl().toSeconds(),
        userMapper.toResponse(user));
  }

  private boolean canAuthenticate(User user) {
    return user.isEmailVerified() && user.isEnabled() && !user.isDeleted();
  }

  private String normalize(String value) {
    return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
  }
}
