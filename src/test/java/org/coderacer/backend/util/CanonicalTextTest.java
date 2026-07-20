package org.coderacer.backend.util;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class CanonicalTextTest {

  @Test
  void canonicalizesCrlfAndLoneCrToLf() {
    assertThat(CanonicalText.canonicalizeLineEndings("a\r\nb")).isEqualTo("a\nb");
    assertThat(CanonicalText.canonicalizeLineEndings("a\rb")).isEqualTo("a\nb");
    assertThat(CanonicalText.canonicalizeLineEndings("a\nb")).isEqualTo("a\nb");
  }

  @Test
  void tabsAndNewlinesCountAsOneCharacterEach() {
    int[] codePoints = CanonicalText.toCodePoints(CanonicalText.canonicalizeLineEndings("a\tb\nc"));
    assertThat(codePoints).hasSize(5);
  }

  @Test
  void countsUnicodeCodePointsNotUtf16Units() {
    String emoji = "\uD83D\uDE00";
    assertThat(emoji.length()).isEqualTo(2);
    assertThat(CanonicalText.toCodePoints(emoji)).hasSize(1);
  }
}
