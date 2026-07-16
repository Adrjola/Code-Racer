package org.coderacer.backend.controller;

import org.coderacer.backend.dto.SoloAttemptResultResponse;
import org.coderacer.backend.model.SoloAttempt;

final class SoloAttemptResponseMapper {

  private SoloAttemptResponseMapper() {}

  static SoloAttemptResultResponse toResultResponse(SoloAttempt attempt) {
    return new SoloAttemptResultResponse(
        attempt.getId(),
        attempt.getState(),
        attempt.getCpm(),
        attempt.getDurationMs(),
        attempt.getFinishedAt(),
        attempt.getDifficulty());
  }
}
