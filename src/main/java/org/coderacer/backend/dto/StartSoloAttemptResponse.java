package org.coderacer.backend.dto;

import java.time.Instant;
import java.util.UUID;
import org.coderacer.backend.model.Difficulty;

public record StartSoloAttemptResponse(
    UUID attemptId, UUID codeSnippetId, Difficulty difficulty, Instant startedAt) {}
