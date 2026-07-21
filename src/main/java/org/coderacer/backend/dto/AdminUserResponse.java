package org.coderacer.backend.dto;

import java.time.Instant;
import java.util.UUID;
import org.coderacer.backend.enums.UserRole;

public record AdminUserResponse(
    UUID id,
    String username,
    String email,
    UserRole role,
    boolean emailVerified,
    boolean enabled,
    boolean deleted,
    Instant createdAt,
    Instant updatedAt) {}
