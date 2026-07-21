package org.coderacer.backend.dto;

import java.time.Instant;
import java.util.UUID;
import org.coderacer.backend.enums.Difficulty;
import org.coderacer.backend.enums.SnippetLifecycle;

public record SnippetResponse(
    UUID id,
    String title,
    String source,
    Difficulty difficulty,
    SnippetLifecycle lifecycle,
    UUID categoryId,
    Instant createdAt,
    Instant updatedAt) {}
