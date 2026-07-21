package org.coderacer.backend.mapper;

import org.coderacer.backend.dto.SoloAttemptResultResponse;
import org.coderacer.backend.dto.SoloAttemptSnippetSummary;
import org.coderacer.backend.model.CodeSnippet;
import org.coderacer.backend.model.SoloAttempt;
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
        snippet.getId(), snippet.getTitle(), snippet.getCategory());
  }
}
