package org.coderacer.backend.repository;

import org.coderacer.backend.enums.Difficulty;

/**
 * One aggregated row per difficulty, produced by PostgreSQL and mapped straight into this interface
 * so no attempt entities are loaded. Averages come back as doubles for the service to round;
 * missing metrics are null.
 */
public interface DifficultyStatsProjection {
  Difficulty getDifficulty();

  Long getFastestDurationMs();

  Integer getHighestCpm();

  Double getAverageDurationMs();

  Double getAverageCpm();
}
