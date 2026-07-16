package org.coderacer.backend.user.mapper;

import org.coderacer.backend.user.dto.UserResponse;
import org.coderacer.backend.user.model.User;
import org.springframework.stereotype.Component;

/** Maps user entities to safe response DTOs. */
@Component
public class UserMapper {

  public UserResponse toResponse(User user) {
    return new UserResponse(
        user.getId(),
        user.getEmail(),
        user.getUsername(),
        user.getRole(),
        user.isEmailVerified(),
        user.isEnabled(),
        user.getCreatedAt(),
        user.getUpdatedAt());
  }
}
