package org.coderacer.backend.dto;

import org.coderacer.backend.enums.Difficulty;

/**
 * The global records for one difficulty. Either record is null when no valid completed attempt
 * exists at that difficulty.
 */
public record DifficultyGlobalStatistics(
    Difficulty difficulty, FastestTimeRecord fastestTime, HighestCpmRecord highestCpm) {}
