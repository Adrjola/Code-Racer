package org.coderacer.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record EmailVerificationResendRequest(@NotBlank @Email @Size(max = 120) String email) {}
