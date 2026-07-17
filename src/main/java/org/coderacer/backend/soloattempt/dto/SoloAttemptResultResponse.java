package org.coderacer.backend.soloattempt.dto;

import java.time.Instant;
import java.util.UUID;
import org.coderacer.backend.snippet.model.Difficulty;
import org.coderacer.backend.soloattempt.model.SoloAttemptState;

public record SoloAttemptResultResponse(
    UUID attemptId,
    SoloAttemptSnippetSummary snippet,
    Difficulty difficulty,
    SoloAttemptState state,
    Long durationMs,
    Integer cpm,
    Instant startedAt,
    Instant finishedAt) {}
