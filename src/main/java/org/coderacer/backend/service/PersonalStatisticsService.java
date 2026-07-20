package org.coderacer.backend.service;

import java.util.EnumMap;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Stream;
import lombok.RequiredArgsConstructor;
import org.coderacer.backend.dto.DifficultyStatistics;
import org.coderacer.backend.dto.PersonalStatisticsResponse;
import org.coderacer.backend.enums.Difficulty;
import org.coderacer.backend.repository.DifficultyStatsProjection;
import org.coderacer.backend.repository.SoloAttemptRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PersonalStatisticsService {

  private final SoloAttemptRepository repository;

  @Transactional(readOnly = true)
  public PersonalStatisticsResponse forUser(UUID userId) {
    Map<Difficulty, DifficultyStatsProjection> byDifficulty = new EnumMap<>(Difficulty.class);
    for (DifficultyStatsProjection row : repository.aggregateCompletedByDifficulty(userId)) {
      byDifficulty.put(row.getDifficulty(), row);
    }

    // Every difficulty is always present so the contract shape is stable; ones
    // without completed attempts come back with all-null metrics.
    return new PersonalStatisticsResponse(
        Stream.of(Difficulty.values())
            .map(difficulty -> toStatistics(difficulty, byDifficulty.get(difficulty)))
            .toList());
  }

  private DifficultyStatistics toStatistics(Difficulty difficulty, DifficultyStatsProjection row) {
    if (row == null) {
      return new DifficultyStatistics(difficulty, null, null, null, null);
    }
    return new DifficultyStatistics(
        difficulty,
        row.getFastestDurationMs(),
        row.getHighestCpm(),
        roundToLong(row.getAverageDurationMs()),
        roundToInt(row.getAverageCpm()));
  }

  private Long roundToLong(Double value) {
    return value == null ? null : Math.round(value);
  }

  private Integer roundToInt(Double value) {
    return value == null ? null : Math.toIntExact(Math.round(value));
  }
}
