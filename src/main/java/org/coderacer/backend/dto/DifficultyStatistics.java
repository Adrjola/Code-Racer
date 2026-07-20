package org.coderacer.backend.dto;

import org.coderacer.backend.enums.Difficulty;

/**
 * The four personal performance metrics for one difficulty. Durations are milliseconds and cpm is
 * characters per minute; any metric is null when the player has no completed attempts at that
 * difficulty.
 */
public record DifficultyStatistics(
    Difficulty difficulty,
    Long fastestDurationMs,
    Integer highestCpm,
    Long averageDurationMs,
    Integer averageCpm) {}
