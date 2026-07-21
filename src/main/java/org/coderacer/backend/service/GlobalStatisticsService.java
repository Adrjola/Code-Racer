package org.coderacer.backend.service;

import java.util.stream.Stream;
import lombok.RequiredArgsConstructor;
import org.coderacer.backend.dto.DifficultyGlobalStatistics;
import org.coderacer.backend.dto.FastestTimeRecord;
import org.coderacer.backend.dto.GlobalStatisticsResponse;
import org.coderacer.backend.dto.HighestCpmRecord;
import org.coderacer.backend.enums.Difficulty;
import org.coderacer.backend.enums.SoloAttemptState;
import org.coderacer.backend.model.SoloAttempt;
import org.coderacer.backend.repository.SoloAttemptRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class GlobalStatisticsService {

  private final SoloAttemptRepository repository;

  @Transactional(readOnly = true)
  public GlobalStatisticsResponse compute() {
    return new GlobalStatisticsResponse(
        Stream.of(Difficulty.values()).map(this::forDifficulty).toList());
  }

  private DifficultyGlobalStatistics forDifficulty(Difficulty difficulty) {
    FastestTimeRecord fastestTime =
        repository
            .findFirstByDifficultyAndStateAndUser_EnabledTrueAndUser_DeletedFalseOrderByDurationMsAscFinishedAtAscUser_IdAsc(
                difficulty, SoloAttemptState.COMPLETED)
            .map(this::toFastestTimeRecord)
            .orElse(null);
    HighestCpmRecord highestCpm =
        repository
            .findFirstByDifficultyAndStateAndUser_EnabledTrueAndUser_DeletedFalseOrderByCpmDescFinishedAtAscUser_IdAsc(
                difficulty, SoloAttemptState.COMPLETED)
            .map(this::toHighestCpmRecord)
            .orElse(null);
    return new DifficultyGlobalStatistics(difficulty, fastestTime, highestCpm);
  }

  private FastestTimeRecord toFastestTimeRecord(SoloAttempt attempt) {
    return new FastestTimeRecord(
        attempt.getUser().getUsername(), attempt.getDurationMs(), attempt.getFinishedAt());
  }

  private HighestCpmRecord toHighestCpmRecord(SoloAttempt attempt) {
    return new HighestCpmRecord(
        attempt.getUser().getUsername(), attempt.getCpm(), attempt.getFinishedAt());
  }
}
