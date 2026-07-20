package org.coderacer.backend.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record StartSoloAttemptRequest(@NotNull UUID codeSnippetId) {}
