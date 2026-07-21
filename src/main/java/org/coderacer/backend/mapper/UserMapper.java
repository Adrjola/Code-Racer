package org.coderacer.backend.mapper;

import org.coderacer.backend.dto.UserResponse;
import org.coderacer.backend.model.User;
import org.springframework.stereotype.Component;

@Component
public class UserMapper {

  public UserResponse toResponse(User user) {
    return new UserResponse(
        user.getId(),
        user.getEmail(),
        user.getUsername(),
        user.getRole(),
        user.isEmailVerified(),
        user.getCreatedAt(),
        user.getUpdatedAt());
  }
}
