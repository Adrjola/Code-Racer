package org.coderacer.backend.dto;

public record LoginResponse(
    String accessToken, String tokenType, long expiresInSeconds, UserResponse user) {}
