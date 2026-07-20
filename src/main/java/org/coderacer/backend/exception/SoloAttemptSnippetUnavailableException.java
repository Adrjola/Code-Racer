package org.coderacer.backend.exception;

public class SoloAttemptSnippetUnavailableException extends ConflictException {
  public SoloAttemptSnippetUnavailableException(String message) {
    super(message, "SOLO_ATTEMPT_SNIPPET_UNAVAILABLE");
  }
}
