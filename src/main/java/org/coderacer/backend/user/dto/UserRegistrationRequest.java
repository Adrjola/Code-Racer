package org.coderacer.backend.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UserRegistrationRequest(
    @NotBlank @Size(max = 254) String email,
    @NotBlank @Size(max = 30) String username,
    @NotBlank @Size(max = 128) String password,
    @NotBlank @Size(max = 128) String confirmPassword) {}
