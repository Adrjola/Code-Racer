package org.coderacer.backend.dto;

import java.util.UUID;
import org.coderacer.backend.enums.SoloAttemptState;

public record AbandonResponse(UUID attemptId, SoloAttemptState state) {}
