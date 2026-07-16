package org.coderacer.backend.auth.dto;

import org.coderacer.backend.user.dto.UserResponse;

public record LoginResponse(
    String accessToken, String tokenType, long expiresInSeconds, UserResponse user) {}
