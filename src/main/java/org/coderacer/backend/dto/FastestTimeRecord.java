package org.coderacer.backend.dto;

import java.time.Instant;

/** The global fastest-completion record for one difficulty. Public-safe: username only. */
public record FastestTimeRecord(String username, Long durationMs, Instant recordedAt) {}
