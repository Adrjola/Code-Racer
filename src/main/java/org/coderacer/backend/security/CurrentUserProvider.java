package org.coderacer.backend.security;

import jakarta.servlet.http.HttpServletRequest;
import java.util.UUID;

public interface CurrentUserProvider {
  UUID resolve(HttpServletRequest request);
}
