package org.coderacer.backend.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UserRegistrationRequest(
    @NotBlank @Size(max = 120) String email,
    @NotBlank @Size(max = 20) String username,
    @NotBlank @Size(max = 72) String password,
    @NotBlank @Size(max = 72) String confirmPassword) {}
