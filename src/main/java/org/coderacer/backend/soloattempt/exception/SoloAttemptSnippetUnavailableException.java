package org.coderacer.backend.soloattempt.exception;

import org.coderacer.backend.common.exception.ConflictException;

public class SoloAttemptSnippetUnavailableException extends ConflictException {
  public SoloAttemptSnippetUnavailableException(String message) {
    super(message, "SOLO_ATTEMPT_SNIPPET_UNAVAILABLE");
  }
}
