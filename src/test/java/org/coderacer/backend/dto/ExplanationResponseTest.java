package org.coderacer.backend.dto;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Collections;
import java.util.List;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;

class ExplanationResponseTest {

  private static final List<String> VALID_SECTION = List.of("item");

  @Test
  void isValid_allFieldsPresent_returnsTrue() {
    var r = new ExplanationResponse("summary", VALID_SECTION, VALID_SECTION, VALID_SECTION);
    assertThat(r.isValid()).isTrue();
  }

  @Test
  void isValid_nullSummary_returnsFalse() {
    var r = new ExplanationResponse(null, VALID_SECTION, VALID_SECTION, VALID_SECTION);
    assertThat(r.isValid()).isFalse();
  }

  @Test
  void isValid_blankSummary_returnsFalse() {
    var r = new ExplanationResponse("   ", VALID_SECTION, VALID_SECTION, VALID_SECTION);
    assertThat(r.isValid()).isFalse();
  }

  @Test
  void isValid_summaryExceedsMaxLength_returnsFalse() {
    String longSummary = "x".repeat(ExplanationResponse.MAX_SUMMARY_LENGTH + 1);
    var r = new ExplanationResponse(longSummary, VALID_SECTION, VALID_SECTION, VALID_SECTION);
    assertThat(r.isValid()).isFalse();
  }

  @Test
  void isValid_nullSection_returnsFalse() {
    var r = new ExplanationResponse("summary", null, VALID_SECTION, VALID_SECTION);
    assertThat(r.isValid()).isFalse();
  }

  @Test
  void isValid_emptySection_returnsFalse() {
    var r = new ExplanationResponse("summary", List.of(), VALID_SECTION, VALID_SECTION);
    assertThat(r.isValid()).isFalse();
  }

  @Test
  void isValid_sectionExceedsMaxItems_returnsFalse() {
    List<String> tooMany =
        IntStream.rangeClosed(1, ExplanationResponse.MAX_SECTION_ITEMS + 1)
            .mapToObj(i -> "item " + i)
            .toList();
    var r = new ExplanationResponse("summary", tooMany, VALID_SECTION, VALID_SECTION);
    assertThat(r.isValid()).isFalse();
  }

  @Test
  void isValid_sectionItemExceedsMaxLength_returnsFalse() {
    String longItem = "x".repeat(ExplanationResponse.MAX_ITEM_LENGTH + 1);
    var r = new ExplanationResponse("summary", List.of(longItem), VALID_SECTION, VALID_SECTION);
    assertThat(r.isValid()).isFalse();
  }

  @Test
  void isValid_sectionContainsBlankItem_returnsFalse() {
    var r = new ExplanationResponse("summary", List.of("ok", "  "), VALID_SECTION, VALID_SECTION);
    assertThat(r.isValid()).isFalse();
  }

  @Test
  void isValid_sectionContainsNullItem_returnsFalse() {
    var r =
        new ExplanationResponse(
            "summary", Collections.singletonList(null), VALID_SECTION, VALID_SECTION);
    assertThat(r.isValid()).isFalse();
  }

  @Test
  void isValid_conceptsSectionInvalid_returnsFalse() {
    var r = new ExplanationResponse("summary", VALID_SECTION, List.of(), VALID_SECTION);
    assertThat(r.isValid()).isFalse();
  }

  @Test
  void isValid_bestPracticesSectionInvalid_returnsFalse() {
    var r = new ExplanationResponse("summary", VALID_SECTION, VALID_SECTION, List.of());
    assertThat(r.isValid()).isFalse();
  }
}
