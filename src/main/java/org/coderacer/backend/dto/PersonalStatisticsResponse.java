package org.coderacer.backend.dto;

import java.util.List;

/** Personal statistics for the authenticated user, one entry per difficulty. */
public record PersonalStatisticsResponse(List<DifficultyStatistics> difficulties) {}
