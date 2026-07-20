package org.coderacer.backend.service;

import java.time.Instant;

public record ActiveProgress(int acceptedOffset, long lastSequence, Instant lastActivityAt) {}
