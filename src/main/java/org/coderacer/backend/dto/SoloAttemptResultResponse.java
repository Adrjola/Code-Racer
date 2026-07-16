package org.coderacer.backend.dto;

import java.time.Instant;
import java.util.UUID;
import org.coderacer.backend.model.Difficulty;
import org.coderacer.backend.model.SoloAttemptState;

public record SoloAttemptResultResponse(
    UUID attemptId,
    SoloAttemptState state,
    Integer cpm,
    Long durationMs,
    Instant finishedAt,
    Difficulty difficulty) {}
