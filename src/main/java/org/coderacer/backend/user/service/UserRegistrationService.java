package org.coderacer.backend.user.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;
import lombok.RequiredArgsConstructor;
import org.coderacer.backend.common.error.FieldError;
import org.coderacer.backend.common.exception.ConflictException;
import org.coderacer.backend.common.exception.ValidationException;
import org.coderacer.backend.user.dto.UserRegistrationRequest;
import org.coderacer.backend.user.dto.UserResponse;
import org.coderacer.backend.user.mapper.UserMapper;
import org.coderacer.backend.user.model.User;
import org.coderacer.backend.user.model.UserRole;
import org.coderacer.backend.user.repository.UserRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserRegistrationService {

  static final int MIN_PASSWORD_LENGTH = 12;
  static final int MAX_PASSWORD_LENGTH = 72;

  private static final Pattern EMAIL_PATTERN =
      Pattern.compile("^[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}$", Pattern.CASE_INSENSITIVE);
  private static final Pattern USERNAME_PATTERN = Pattern.compile("^[a-z0-9][a-z0-9_-]{2,19}$");
  private static final String DUPLICATE_USER_MESSAGE =
      "A user with this email or username already exists";

  private final UserRepository repository;
  private final PasswordEncoder passwordEncoder;
  private final UserMapper mapper;

  @Transactional
  public UserResponse register(UserRegistrationRequest request) {
    NormalizedRegistration registration = validateAndNormalize(request);
    return createUser(registration, UserRole.USER, false);
  }

  @Transactional
  public UserResponse createInitialAdmin(UserRegistrationRequest request) {
    NormalizedRegistration registration = validateAndNormalize(request);
    return createUser(registration, UserRole.ADMIN, true);
  }

  @Transactional(readOnly = true)
  public boolean adminExists() {
    return repository.existsByRole(UserRole.ADMIN);
  }

  private UserResponse createUser(
      NormalizedRegistration registration, UserRole role, boolean emailVerified) {
    rejectDuplicateIdentifiers(registration.email(), registration.username());

    User user = new User();
    user.setEmail(registration.email());
    user.setUsername(registration.username());
    user.setPasswordHash(passwordEncoder.encode(registration.password()));
    user.setRole(role);
    user.setEmailVerified(emailVerified);
    user.setEnabled(true);
    user.setDeleted(false);

    try {
      return mapper.toResponse(repository.saveAndFlush(user));
    } catch (DataIntegrityViolationException ex) {
      throw duplicateUserConflict();
    }
  }

  private NormalizedRegistration validateAndNormalize(UserRegistrationRequest request) {
    List<FieldError> errors = new ArrayList<>();

    String email = normalize(request.email());
    String username = normalize(request.username());
    validateEmail(email, errors);
    validateUsername(username, errors);
    validatePassword(request.password(), request.confirmPassword(), errors);

    if (!errors.isEmpty()) {
      throw new ValidationException("Registration validation failed", errors);
    }

    return new NormalizedRegistration(email, username, request.password());
  }

  private void validateEmail(String email, List<FieldError> errors) {
    if (email.isBlank()) {
      errors.add(new FieldError("email", "must not be blank"));
    } else if (email.length() > 120 || !EMAIL_PATTERN.matcher(email).matches()) {
      errors.add(new FieldError("email", "must be a valid email address"));
    }
  }

  private void validateUsername(String username, List<FieldError> errors) {
    if (username.isBlank()) {
      errors.add(new FieldError("username", "must not be blank"));
    } else if (!USERNAME_PATTERN.matcher(username).matches()) {
      errors.add(
          new FieldError(
              "username",
              "must be 3 to 20 characters and contain only lowercase letters, numbers, underscores, or hyphens"));
    }
  }

  private void validatePassword(String password, String confirmPassword, List<FieldError> errors) {
    if (password == null || password.isBlank()) {
      errors.add(new FieldError("password", "must not be blank"));
      return;
    }
    if (password.length() < MIN_PASSWORD_LENGTH || password.length() > MAX_PASSWORD_LENGTH) {
      errors.add(
          new FieldError(
              "password",
              "must be between "
                  + MIN_PASSWORD_LENGTH
                  + " and "
                  + MAX_PASSWORD_LENGTH
                  + " characters"));
    }
    if (confirmPassword == null || confirmPassword.isBlank()) {
      errors.add(new FieldError("confirmPassword", "must not be blank"));
    } else if (!password.equals(confirmPassword)) {
      errors.add(new FieldError("confirmPassword", "must match password"));
    }
  }

  private void rejectDuplicateIdentifiers(String email, String username) {
    if (repository.existsByEmail(email) || repository.existsByUsername(username)) {
      throw duplicateUserConflict();
    }
  }

  private ConflictException duplicateUserConflict() {
    return new ConflictException(DUPLICATE_USER_MESSAGE, "USER_ALREADY_EXISTS");
  }

  private String normalize(String value) {
    return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
  }

  private record NormalizedRegistration(String email, String username, String password) {}
}
