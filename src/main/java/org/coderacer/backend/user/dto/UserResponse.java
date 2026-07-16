package org.coderacer.backend.user.dto;

import java.time.Instant;
import java.util.UUID;
import org.coderacer.backend.user.model.UserRole;

public record UserResponse(
    UUID id,
    String email,
    String username,
    UserRole role,
    boolean emailVerified,
    boolean enabled,
    Instant createdAt,
    Instant updatedAt) {}
