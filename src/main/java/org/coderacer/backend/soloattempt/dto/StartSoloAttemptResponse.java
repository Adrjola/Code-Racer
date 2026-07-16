package org.coderacer.backend.soloattempt.dto;

import java.time.Instant;
import java.util.UUID;
import org.coderacer.backend.snippet.model.Difficulty;

public record StartSoloAttemptResponse(
    UUID attemptId, UUID codeSnippetId, Difficulty difficulty, Instant startedAt) {}
