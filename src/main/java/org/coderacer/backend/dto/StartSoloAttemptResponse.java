package org.coderacer.backend.dto;

import java.time.Instant;
import java.util.UUID;
import org.coderacer.backend.enums.Difficulty;

public record StartSoloAttemptResponse(
    UUID attemptId, UUID codeSnippetId, Difficulty difficulty, Instant startedAt) {}
