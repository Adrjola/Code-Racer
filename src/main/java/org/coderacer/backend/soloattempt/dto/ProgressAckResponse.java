package org.coderacer.backend.soloattempt.dto;

import java.util.UUID;
import org.coderacer.backend.soloattempt.model.SoloAttemptState;

public record ProgressAckResponse(UUID attemptId, SoloAttemptState state, int acceptedOffset) {}
