package org.coderacer.backend.snippet.dto;

import java.time.Instant;
import java.util.UUID;
import org.coderacer.backend.snippet.model.Difficulty;
import org.coderacer.backend.snippet.model.SnippetLifecycle;

public record SnippetResponse(
    UUID id,
    UUID snippetId,
    int revisionNumber,
    String title,
    String source,
    Difficulty difficulty,
    SnippetLifecycle lifecycle,
    UUID categoryId,
    Instant createdAt,
    Instant updatedAt,
    long version) {}
