package org.coderacer.backend.model;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import org.junit.jupiter.api.Test;

class StringListConverterTest {

  private final StringListConverter converter = new StringListConverter();

  @Test
  void convertToDatabaseColumn_serializesListToJson() {
    List<String> input = List.of("alpha", "beta", "gamma");
    String json = converter.convertToDatabaseColumn(input);
    assertThat(json).isEqualTo("[\"alpha\",\"beta\",\"gamma\"]");
  }

  @Test
  void convertToDatabaseColumn_emptyList_returnsEmptyJsonArray() {
    String json = converter.convertToDatabaseColumn(List.of());
    assertThat(json).isEqualTo("[]");
  }

  @Test
  void convertToEntityAttribute_deserializesJsonToList() {
    String json = "[\"one\",\"two\"]";
    List<String> result = converter.convertToEntityAttribute(json);
    assertThat(result).containsExactly("one", "two");
  }

  @Test
  void convertToEntityAttribute_emptyArray_returnsEmptyList() {
    List<String> result = converter.convertToEntityAttribute("[]");
    assertThat(result).isEmpty();
  }

  @Test
  void convertToEntityAttribute_invalidJson_throwsException() {
    assertThatThrownBy(() -> converter.convertToEntityAttribute("not json"))
        .isInstanceOf(IllegalArgumentException.class);
  }

  @Test
  void roundTrip_preservesData() {
    List<String> original = List.of("step 1", "step 2", "step 3");
    String json = converter.convertToDatabaseColumn(original);
    List<String> restored = converter.convertToEntityAttribute(json);
    assertThat(restored).isEqualTo(original);
  }
}
