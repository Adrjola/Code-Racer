package org.coderacer.backend.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record LoginRequest(
    @NotBlank @Size(max = 120) String identifier, @NotBlank @Size(max = 72) String password) {}
