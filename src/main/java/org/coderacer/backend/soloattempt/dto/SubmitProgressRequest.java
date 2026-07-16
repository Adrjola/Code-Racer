package org.coderacer.backend.soloattempt.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record SubmitProgressRequest(@NotNull Long sequence, @NotBlank String characters) {}
