package org.coderacer.backend.service;

import java.time.Instant;
import java.util.UUID;

record EmailVerificationRequestedEvent(
    UUID userId, String email, String username, String verificationLink, Instant expiresAt) {}
