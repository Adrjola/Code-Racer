package org.coderacer.backend.soloattempt.service;

import org.coderacer.backend.soloattempt.model.SoloAttempt;

public record ProgressResult(SoloAttempt attempt, int acceptedOffset) {}
