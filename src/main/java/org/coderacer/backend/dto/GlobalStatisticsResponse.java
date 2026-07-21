package org.coderacer.backend.dto;

import java.util.List;

/** Global leaderboard statistics, one entry per difficulty. */
public record GlobalStatisticsResponse(List<DifficultyGlobalStatistics> difficulties) {}
