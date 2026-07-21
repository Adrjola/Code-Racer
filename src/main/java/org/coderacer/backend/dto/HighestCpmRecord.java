package org.coderacer.backend.dto;

import java.time.Instant;

/** The global highest-cpm record for one difficulty. Public-safe: username only. */
public record HighestCpmRecord(String username, Integer cpm, Instant recordedAt) {}
