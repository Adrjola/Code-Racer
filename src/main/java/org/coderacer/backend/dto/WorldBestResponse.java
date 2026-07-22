package org.coderacer.backend.dto;

/**
 * The world-best time and cpm for one snippet, shown on the race intro screen. Public-safe: holder
 * usernames only.r
 */
public record WorldBestResponse(
    Integer cpm, String cpmHolderName, Long durationMs, String timeHolderName) {}
