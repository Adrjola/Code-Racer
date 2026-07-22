package org.coderacer.backend.service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.coderacer.backend.dto.GlobalLeaderboardEntry;
import org.coderacer.backend.dto.GlobalLeaderboardResponse;
import org.coderacer.backend.enums.Difficulty;
import org.coderacer.backend.enums.SoloAttemptState;
import org.coderacer.backend.model.SoloAttempt;
import org.coderacer.backend.repository.SoloAttemptRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class GlobalLeaderboardService {

  private static final Comparator<SoloAttempt> BEST_FIRST =
      Comparator.comparingLong(SoloAttempt::getDurationMs)
          .thenComparing(SoloAttempt::getFinishedAt)
          .thenComparing(attempt -> attempt.getUser().getId());

  private final SoloAttemptRepository repository;

  @Transactional(readOnly = true)
  public GlobalLeaderboardResponse forDifficulty(Difficulty difficulty, int limit) {
    List<SoloAttempt> board =
        repository.findByDifficultyAndStateAndUserDeletedFalse(
            difficulty, SoloAttemptState.COMPLETED);

    List<SoloAttempt> personalBests = personalBestPerUser(board);
    personalBests.sort(BEST_FIRST);

    return new GlobalLeaderboardResponse(difficulty, toRankedEntries(personalBests, limit));
  }

  /** Each user's fastest COMPLETED run, keyed by user id so nobody appears twice. */
  private List<SoloAttempt> personalBestPerUser(List<SoloAttempt> board) {
    Map<UUID, SoloAttempt> bestByUser = new LinkedHashMap<>();
    for (SoloAttempt attempt : board) {
      UUID userId = attempt.getUser().getId();
      SoloAttempt current = bestByUser.get(userId);
      if (current == null || BEST_FIRST.compare(attempt, current) < 0) {
        bestByUser.put(userId, attempt);
      }
    }
    return new ArrayList<>(bestByUser.values());
  }

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
