package org.coderacer.backend.dto;

import java.util.List;
import org.coderacer.backend.enums.Difficulty;

/** The ranked leaderboard for one difficulty, ordered fastest-first with ties sharing a rank. */
public record GlobalLeaderboardResponse(
    Difficulty difficulty, List<GlobalLeaderboardEntry> entries) {}
