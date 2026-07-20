package org.coderacer.backend.exception;

import java.util.UUID;

public class SoloAttemptNotFoundException extends ResourceNotFoundException {
  public SoloAttemptNotFoundException(UUID id) {
    super("Solo attempt not found: " + id, "SOLO_ATTEMPT_NOT_FOUND");
  }
}
