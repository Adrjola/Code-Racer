package org.coderacer.backend.service;

import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.coderacer.backend.dto.SnippetStatistics;
import org.coderacer.backend.enums.SnippetLifecycle;
import org.coderacer.backend.enums.SoloAttemptState;
import org.coderacer.backend.model.CodeSnippet;
import org.coderacer.backend.model.SoloAttempt;
import org.coderacer.backend.repository.SoloAttemptRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class SnippetStatisticsService {

  private final SoloAttemptRepository repository;

  @Transactional(readOnly = true)
  public List<SnippetStatistics> forUser(UUID userId) {
    List<SoloAttempt> attempts =
        repository.findByUserIdAndStateAndCodeSnippetLifecycleNot(
            userId, SoloAttemptState.COMPLETED, SnippetLifecycle.DELETED);

    Map<UUID, SoloAttempt> bestBySnippet = new LinkedHashMap<>();
    for (SoloAttempt attempt : attempts) {
      bestBySnippet.merge(attempt.getCodeSnippet().getId(), attempt, this::better);
    }

    return bestBySnippet.values().stream()
        .map(this::toStatistics)
        .sorted(Comparator.comparing(SnippetStatistics::bestFinishedAt).reversed())
        .toList();
  }

  /** Lower duration wins; ties break by whichever run finished first. */
  private SoloAttempt better(SoloAttempt a, SoloAttempt b) {
    int byDuration = a.getDurationMs().compareTo(b.getDurationMs());
    if (byDuration != 0) {
      return byDuration < 0 ? a : b;
    }
    return a.getFinishedAt().isBefore(b.getFinishedAt()) ? a : b;
  }

  private SnippetStatistics toStatistics(SoloAttempt attempt) {
    CodeSnippet snippet = attempt.getCodeSnippet();
    return new SnippetStatistics(
        snippet.getId(),
        snippet.getTitle(),
        snippet.getCategory().getDisplayName(),
        attempt.getDifficulty(),
        attempt.getDurationMs(),
        attempt.getCpm(),
        attempt.getFinishedAt());
  }
}
