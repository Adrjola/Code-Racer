package org.coderacer.backend.dto;

import java.time.Instant;
import java.util.UUID;

public record CategoryResponse(
    UUID id,
    String name,
    String description,
    boolean active,
    Instant createdAt,
    Instant updatedAt) {}
