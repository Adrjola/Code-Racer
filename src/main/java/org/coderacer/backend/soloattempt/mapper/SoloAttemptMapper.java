package org.coderacer.backend.soloattempt.mapper;

import org.coderacer.backend.snippet.model.CodeSnippet;
import org.coderacer.backend.soloattempt.dto.SoloAttemptResultResponse;
import org.coderacer.backend.soloattempt.dto.SoloAttemptSnippetSummary;
import org.coderacer.backend.soloattempt.model.SoloAttempt;
import org.springframework.stereotype.Component;

@Component
public class SoloAttemptMapper {

  public SoloAttemptResultResponse toResultResponse(SoloAttempt attempt) {
    return new SoloAttemptResultResponse(
        attempt.getId(),
        toSnippetSummary(attempt.getCodeSnippet()),
        attempt.getDifficulty(),
        attempt.getState(),
        attempt.getDurationMs(),
        attempt.getCpm(),
        attempt.getStartedAt(),
        attempt.getFinishedAt());
  }

  private SoloAttemptSnippetSummary toSnippetSummary(CodeSnippet snippet) {
    return new SoloAttemptSnippetSummary(
        snippet.getId(),
        snippet.getSnippetId(),
        snippet.getRevisionNumber(),
        snippet.getTitle(),
        snippet.getCategory().getId());
  }
}
