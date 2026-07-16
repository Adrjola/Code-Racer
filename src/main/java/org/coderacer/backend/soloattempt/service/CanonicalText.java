package org.coderacer.backend.soloattempt.service;

public final class CanonicalText {

  private CanonicalText() {}

  public static String canonicalizeLineEndings(String raw) {
    return raw.replace("\r\n", "\n").replace("\r", "\n");
  }

  public static int[] toCodePoints(String canonical) {
    return canonical.codePoints().toArray();
  }
}
