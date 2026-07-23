package org.coderacer.backend.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

public record SubmitProgressRequest(@NotNull Long sequence, @NotEmpty String characters) {}
