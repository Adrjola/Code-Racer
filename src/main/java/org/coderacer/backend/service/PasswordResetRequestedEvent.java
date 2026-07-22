package org.coderacer.backend.service;

import java.time.Instant;

record PasswordResetRequestedEvent(String email, String rawToken, Instant expiresAt) {}
