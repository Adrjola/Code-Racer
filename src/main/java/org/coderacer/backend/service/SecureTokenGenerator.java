package org.coderacer.backend.service;

import java.security.SecureRandom;
import java.util.Base64;
import org.springframework.stereotype.Component;

@Component
public class SecureTokenGenerator {

  private static final int TOKEN_BYTES = 32;

  private final SecureRandom secureRandom = new SecureRandom();

  public String generate() {
    byte[] token = new byte[TOKEN_BYTES];
    secureRandom.nextBytes(token);
    return Base64.getUrlEncoder().withoutPadding().encodeToString(token);
  }
}
