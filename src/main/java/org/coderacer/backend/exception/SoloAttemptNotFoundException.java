package org.coderacer.backend.exception;

import java.util.UUID;

public class SoloAttemptNotFoundException extends RuntimeException {
  public SoloAttemptNotFoundException(UUID id) {
    super("Solo attempt not found: " + id);
  }
}
