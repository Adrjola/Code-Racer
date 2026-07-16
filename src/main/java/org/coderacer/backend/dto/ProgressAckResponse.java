package org.coderacer.backend.dto;

import java.util.UUID;
import org.coderacer.backend.model.SoloAttemptState;

public record ProgressAckResponse(UUID attemptId, SoloAttemptState state, int acceptedOffset) {}
