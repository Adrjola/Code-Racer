package org.coderacer.backend.soloattempt.exception;

import java.util.UUID;
import org.coderacer.backend.common.exception.ResourceNotFoundException;

public class SoloAttemptNotFoundException extends ResourceNotFoundException {
  public SoloAttemptNotFoundException(UUID id) {
    super("Solo attempt not found: " + id, "SOLO_ATTEMPT_NOT_FOUND");
  }
}
