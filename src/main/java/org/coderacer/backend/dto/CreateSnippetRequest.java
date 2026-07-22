package org.coderacer.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.coderacer.backend.enums.Category;
import org.coderacer.backend.enums.Difficulty;

public record CreateSnippetRequest(
    @NotBlank String title,
    @NotBlank String source,
    @NotNull Difficulty difficulty,
    @NotNull Category category) {}
