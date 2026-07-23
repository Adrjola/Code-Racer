package org.coderacer.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UserRegistrationRequest(
    @NotBlank @Size(max = 120) String email,
    @NotBlank @Size(max = 20) String username,
    @NotBlank @Size(min = 8, max = 72) String password,
    @NotBlank @Size(min = 8, max = 72) String confirmPassword) {}
