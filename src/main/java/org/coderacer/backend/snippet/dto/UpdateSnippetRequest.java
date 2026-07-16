package org.coderacer.backend.snippet.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;
import org.coderacer.backend.snippet.model.Difficulty;

public record UpdateSnippetRequest(
    @NotBlank String title,
    @NotBlank String source,
    @NotNull Difficulty difficulty,
    @NotNull UUID categoryId,
    @NotNull Long version) {}
