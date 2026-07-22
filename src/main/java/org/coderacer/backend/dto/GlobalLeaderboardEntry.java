package org.coderacer.backend.dto;

/** One racer's personal-best row on the global leaderboard. Public-safe: username only. */
public record GlobalLeaderboardEntry(int rank, String username, Long durationMs, Integer cpm) {}
