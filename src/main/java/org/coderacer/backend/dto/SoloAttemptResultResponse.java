package org.coderacer.backend.dto;

import java.time.Instant;
import java.util.UUID;
import org.coderacer.backend.enums.Difficulty;
import org.coderacer.backend.enums.SoloAttemptState;

public record SoloAttemptResultResponse(
    UUID attemptId,
    SoloAttemptSnippetSummary snippet,
    Difficulty difficulty,
    SoloAttemptState state,
    Long durationMs,
    Integer cpm,
    Instant startedAt,
    Instant finishedAt) {}
