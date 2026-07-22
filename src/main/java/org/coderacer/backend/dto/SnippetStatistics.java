package org.coderacer.backend.dto;

import java.time.Instant;
import java.util.UUID;
import org.coderacer.backend.enums.Difficulty;

/** The authenticated user's personal-best completed run on one snippet. */
public record SnippetStatistics(
    UUID snippetId,
    String snippetTitle,
    String categoryName,
    Difficulty difficulty,
    long bestDurationMs,
    int bestCpm,
    Instant bestFinishedAt) {}
