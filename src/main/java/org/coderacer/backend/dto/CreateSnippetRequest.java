package org.coderacer.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;
import org.coderacer.backend.enums.Difficulty;

public record CreateSnippetRequest(
    @NotBlank String title,
    @NotBlank String source,
    @NotNull Difficulty difficulty,
    @NotNull UUID categoryId) {}
