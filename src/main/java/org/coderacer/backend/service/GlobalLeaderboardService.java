package org.coderacer.backend.service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.coderacer.backend.dto.GlobalLeaderboardEntry;
import org.coderacer.backend.dto.GlobalLeaderboardResponse;
import org.coderacer.backend.enums.Difficulty;
import org.coderacer.backend.model.SoloAttempt;
import org.coderacer.backend.repository.SoloAttemptRepository;
import org.coderacer.backend.repository.SoloAttemptSpecifications;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class GlobalLeaderboardService {

  private final SoloAttemptRepository repository;

  @Transactional(readOnly = true)
  public GlobalLeaderboardResponse forDifficulty(Difficulty difficulty, int limit) {
    Specification<SoloAttempt> scope =
        Specification.where(SoloAttemptSpecifications.completed())
            .and(SoloAttemptSpecifications.nonDeletedUser())
            .and(SoloAttemptSpecifications.onAvailableSnippet())
            .and(SoloAttemptSpecifications.forDifficulty(difficulty));

    List<SoloAttempt> board =
        repository.findAll(scope, SoloAttemptSpecifications.fastestTimeFirst());

    List<SoloAttempt> personalBests = personalBestPerUser(board);

    return new GlobalLeaderboardResponse(difficulty, toRankedEntries(personalBests, limit));
  }

  /**
   * {@code board} is already sorted fastest-first, so each user's first appearance in it is their
   * personal best — no separate comparison is needed to pick it out.
   */
  private List<SoloAttempt> personalBestPerUser(List<SoloAttempt> board) {
    Map<UUID, SoloAttempt> bestByUser = new LinkedHashMap<>();
    for (SoloAttempt attempt : board) {
      bestByUser.putIfAbsent(attempt.getUser().getId(), attempt);
    }
    return new ArrayList<>(bestByUser.values());
  }

  /** Standard competition ranking: equal durationMs values share the same rank. */
  private List<GlobalLeaderboardEntry> toRankedEntries(
      List<SoloAttempt> sortedPersonalBests, int limit) {
    List<GlobalLeaderboardEntry> entries = new ArrayList<>();
    int rank = 0;
    Long previousDurationMs = null;
    for (int i = 0; i < sortedPersonalBests.size() && entries.size() < limit; i++) {
      SoloAttempt attempt = sortedPersonalBests.get(i);
      if (previousDurationMs == null || !previousDurationMs.equals(attempt.getDurationMs())) {
        rank = i + 1;
      }
      entries.add(
          new GlobalLeaderboardEntry(
              rank, attempt.getUser().getUsername(), attempt.getDurationMs(), attempt.getCpm()));
      previousDurationMs = attempt.getDurationMs();
    }
    return entries;
  }
}
