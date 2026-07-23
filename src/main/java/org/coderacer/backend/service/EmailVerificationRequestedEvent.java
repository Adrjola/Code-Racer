package org.coderacer.backend.service;

import java.time.Instant;

record EmailVerificationRequestedEvent(String email, String rawToken, Instant expiresAt) {}
