package org.coderacer.backend.dto;

import java.util.UUID;

/**
 * Leaderboard and personal-best context for one finished attempt. {@code attemptRank} is where this
 * run would land, {@code globalRank} is the position the player holds now.
 */
public record SoloAttemptRankingResponse(
    UUID attemptId,
    boolean newPersonalBest,
    Long previousBestDurationMs,
    Integer previousBestCpm,
    int attemptRank,
    int globalRank,
    Integer previousGlobalRank) {}
