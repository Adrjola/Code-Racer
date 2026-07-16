package org.coderacer.backend.soloattempt.dto;

import java.time.Instant;
import java.util.UUID;
import org.coderacer.backend.soloattempt.model.Difficulty;
import org.coderacer.backend.soloattempt.model.SoloAttemptState;

public record SoloAttemptResultResponse(
    UUID attemptId,
    SoloAttemptState state,
    Integer cpm,
    Long durationMs,
    Instant finishedAt,
    Difficulty difficulty) {}
