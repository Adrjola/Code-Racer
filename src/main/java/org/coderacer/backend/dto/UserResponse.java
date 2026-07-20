package org.coderacer.backend.dto;

import java.time.Instant;
import java.util.UUID;
import org.coderacer.backend.enums.UserRole;

public record UserResponse(
    UUID id,
    String email,
    String username,
    UserRole role,
    boolean emailVerified,
    boolean enabled,
    Instant createdAt,
    Instant updatedAt) {}
