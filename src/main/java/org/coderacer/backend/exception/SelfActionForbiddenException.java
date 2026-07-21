package org.coderacer.backend.exception;

import org.springframework.http.HttpStatus;

public class SelfActionForbiddenException extends BaseException {
  public SelfActionForbiddenException(String message) {
    super(message, "SELF_ACTION_FORBIDDEN", HttpStatus.FORBIDDEN);
  }
}
