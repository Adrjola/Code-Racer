package org.coderacer.backend.service;

import org.coderacer.backend.model.SoloAttempt;

public record ProgressResult(SoloAttempt attempt, int acceptedOffset) {}
