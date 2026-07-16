package org.coderacer.backend.dto;

import java.util.UUID;
import org.coderacer.backend.model.SoloAttemptState;

public record AbandonResponse(UUID attemptId, SoloAttemptState state) {}
