package org.coderacer.backend.service;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;
import lombok.RequiredArgsConstructor;
import org.coderacer.backend.dto.UserRegistrationRequest;
import org.coderacer.backend.dto.UserResponse;
import org.coderacer.backend.enums.UserRole;
import org.coderacer.backend.exception.ConflictException;
import org.coderacer.backend.exception.ValidationException;
import org.coderacer.backend.mapper.UserMapper;
import org.coderacer.backend.model.User;
import org.coderacer.backend.repository.UserRepository;
import org.coderacer.backend.util.IdentifierNormalizer;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserRegistrationService {

  static final int MIN_PASSWORD_LENGTH = 8;
  static final int MAX_PASSWORD_LENGTH = 16;

  private static final Pattern EMAIL_PATTERN =
      Pattern.compile("^[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}$", Pattern.CASE_INSENSITIVE);
  private static final Pattern USERNAME_PATTERN =
      Pattern.compile("^[A-Z0-9][A-Z0-9_-]{2,19}$", Pattern.CASE_INSENSITIVE);
  private static final String DUPLICATE_USER_MESSAGE =
      "A user with this email or username already exists";

  private final UserRepository repository;
  private final PasswordEncoder passwordEncoder;
  private final UserMapper mapper;
  private final EmailVerificationService emailVerificationService;

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
    rejectDuplicateIdentifiers(registration.email(), registration.usernameNormalized());

    User user = new User();
    user.setEmail(registration.email());
    user.setUsername(registration.username());
    user.setPasswordHash(passwordEncoder.encode(registration.password()));
    user.setRole(role);
    user.setEmailVerified(emailVerified);
    user.setDeleted(false);

    User savedUser = saveUser(user);
    if (!emailVerified) {
      emailVerificationService.sendInitialVerificationEmail(savedUser);
    }
    return mapper.toResponse(savedUser);
  }

  private User saveUser(User user) {
    try {
      return repository.saveAndFlush(user);
    } catch (DataIntegrityViolationException ex) {
      throw duplicateUserConflict();
    }
  }

  private NormalizedRegistration validateAndNormalize(UserRegistrationRequest request) {
    List<String> errors = new ArrayList<>();

    String email = normalize(request.email());
    String username = trim(request.username());
    String usernameNormalized = normalize(username);
    validateEmail(email, errors);
    validateUsername(username, errors);
    validatePassword(request.password(), request.confirmPassword(), errors);

    if (!errors.isEmpty()) {
      throw new ValidationException("Registration validation failed: " + String.join("; ", errors));
    }

    return new NormalizedRegistration(email, username, usernameNormalized, request.password());
  }

  private void validateEmail(String email, List<String> errors) {
    if (email.isBlank()) {
      errors.add("email must not be blank");
    } else if (email.length() > 120 || !EMAIL_PATTERN.matcher(email).matches()) {
      errors.add("email must be a valid email address");
    }
  }

  private void validateUsername(String username, List<String> errors) {
    if (username.isBlank()) {
      errors.add("username must not be blank");
    } else if (!USERNAME_PATTERN.matcher(username).matches()) {
      errors.add(
          "username must be 3 to 20 characters and contain only letters, numbers, underscores, or hyphens");
    }
  }

  private void validatePassword(String password, String confirmPassword, List<String> errors) {
    if (password == null || password.isBlank()) {
      errors.add("password must not be blank");
      return;
    }
    if (password.length() < MIN_PASSWORD_LENGTH || password.length() > MAX_PASSWORD_LENGTH) {
      errors.add(
          "password must be between "
              + MIN_PASSWORD_LENGTH
              + " and "
              + MAX_PASSWORD_LENGTH
              + " characters");
    }
    if (confirmPassword == null || confirmPassword.isBlank()) {
      errors.add("confirmPassword must not be blank");
    } else if (!password.equals(confirmPassword)) {
      errors.add("confirmPassword must match password");
    }
  }

  private void rejectDuplicateIdentifiers(String email, String usernameNormalized) {
    if (repository.existsByEmail(email)
        || repository.existsByUsernameNormalized(usernameNormalized)) {
      throw duplicateUserConflict();
    }
  }

  private ConflictException duplicateUserConflict() {
    return new ConflictException(DUPLICATE_USER_MESSAGE, "USER_ALREADY_EXISTS");
  }

  private String normalize(String value) {
    return IdentifierNormalizer.normalize(value);
  }

  private String trim(String value) {
    return value == null ? "" : value.trim();
  }

  private record NormalizedRegistration(
      String email, String username, String usernameNormalized, String password) {}
}
