package org.coderacer.backend.progress;

import java.time.Instant;

public record ActiveProgress(int acceptedOffset, long lastSequence, Instant lastActivityAt) {}
