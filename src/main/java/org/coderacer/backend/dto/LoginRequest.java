package org.coderacer.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record LoginRequest(
    @NotBlank @Size(max = 120) String identifier,
    @NotBlank @Size(min = 8, max = 72) String password) {}
