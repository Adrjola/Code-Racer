package org.coderacer.backend.common.text;

import java.util.Locale;

public final class IdentifierNormalizer {

  private IdentifierNormalizer() {}

  public static String normalize(String value) {
    return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
  }
}
