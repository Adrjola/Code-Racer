package org.coderacer.backend.service;

import java.util.Optional;
import java.util.stream.Stream;
import lombok.RequiredArgsConstructor;
import org.coderacer.backend.dto.DifficultyGlobalStatistics;
import org.coderacer.backend.dto.FastestTimeRecord;
import org.coderacer.backend.dto.GlobalStatisticsResponse;
import org.coderacer.backend.dto.HighestCpmRecord;
import org.coderacer.backend.enums.Difficulty;
import org.coderacer.backend.model.SoloAttempt;
import org.coderacer.backend.repository.SoloAttemptRepository;
import org.coderacer.backend.repository.SoloAttemptSpecifications;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
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
    Specification<SoloAttempt> scope =
        Specification.where(SoloAttemptSpecifications.completed())
            .and(SoloAttemptSpecifications.nonDeletedUser())
            .and(SoloAttemptSpecifications.forDifficulty(difficulty));

    FastestTimeRecord fastestTime =
        findFirst(scope, SoloAttemptSpecifications.fastestTimeFirst())
            .map(this::toFastestTimeRecord)
            .orElse(null);
    HighestCpmRecord highestCpm =
        findFirst(scope, SoloAttemptSpecifications.highestCpmFirst())
            .map(this::toHighestCpmRecord)
            .orElse(null);
    return new DifficultyGlobalStatistics(difficulty, fastestTime, highestCpm);
  }

  private Optional<SoloAttempt> findFirst(Specification<SoloAttempt> scope, Sort sort) {
    return repository.findAll(scope, PageRequest.of(0, 1, sort)).stream().findFirst();
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
