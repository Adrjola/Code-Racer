package org.coderacer.backend.soloattempt.identity;

import jakarta.servlet.http.HttpServletRequest;
import java.util.UUID;
import org.coderacer.backend.soloattempt.exception.MissingCurrentUserException;
import org.springframework.stereotype.Component;

@Component
public class HeaderCurrentUserProvider implements CurrentUserProvider {

  public static final String HEADER_NAME = "X-User-Id";

  @Override
  public UUID resolve(HttpServletRequest request) {
    String header = request.getHeader(HEADER_NAME);
    if (header == null || header.isBlank()) {
      throw new MissingCurrentUserException("Missing required header: " + HEADER_NAME);
    }
    try {
      return UUID.fromString(header.trim());
    } catch (IllegalArgumentException e) {
      throw new MissingCurrentUserException("Invalid " + HEADER_NAME + " header value");
    }
  }
}
