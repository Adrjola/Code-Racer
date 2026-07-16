package org.coderacer.backend.soloattempt.mapper;

import org.coderacer.backend.soloattempt.dto.SoloAttemptResultResponse;
import org.coderacer.backend.soloattempt.model.SoloAttempt;
import org.springframework.stereotype.Component;

/** Maps {@link SoloAttempt} entities to response DTOs. */
@Component
public class SoloAttemptMapper {

  public SoloAttemptResultResponse toResultResponse(SoloAttempt attempt) {
    return new SoloAttemptResultResponse(
        attempt.getId(),
        attempt.getState(),
        attempt.getCpm(),
        attempt.getDurationMs(),
        attempt.getFinishedAt(),
        attempt.getDifficulty());
  }
}
