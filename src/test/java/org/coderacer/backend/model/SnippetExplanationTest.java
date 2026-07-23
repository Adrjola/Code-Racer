package org.coderacer.backend.model;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;

import java.util.List;
import org.coderacer.backend.dto.ExplanationResponse;
import org.junit.jupiter.api.Test;

class SnippetExplanationTest {

  private static final List<String> STEPS = List.of("Step 1", "Step 2");
  private static final List<String> CONCEPTS = List.of("Concept A");
  private static final List<String> PRACTICES = List.of("Practice X", "Practice Y");

  @Test
  void constructor_mapsAllFieldsFromResponse() {
    CodeSnippet snippet = mock(CodeSnippet.class);
    ExplanationResponse response = new ExplanationResponse("A summary", STEPS, CONCEPTS, PRACTICES);

    SnippetExplanation entity = new SnippetExplanation(snippet, response);

    assertThat(entity.getSnippet()).isSameAs(snippet);
    assertThat(entity.getSummary()).isEqualTo("A summary");
    assertThat(entity.getStepByStep()).isEqualTo(STEPS);
    assertThat(entity.getConcepts()).isEqualTo(CONCEPTS);
    assertThat(entity.getBestPractices()).isEqualTo(PRACTICES);
  }

  @Test
  void constructor_throwsOnNullSnippet() {
    ExplanationResponse response = new ExplanationResponse("summary", STEPS, CONCEPTS, PRACTICES);

    assertThatThrownBy(() -> new SnippetExplanation(null, response))
        .isInstanceOf(NullPointerException.class);
  }

  @Test
  void toResponse_returnsMatchingExplanationResponse() {
    CodeSnippet snippet = mock(CodeSnippet.class);
    ExplanationResponse original =
        new ExplanationResponse("Summary text", STEPS, CONCEPTS, PRACTICES);

    SnippetExplanation entity = new SnippetExplanation(snippet, original);
    ExplanationResponse result = entity.toResponse();

    assertThat(result.summary()).isEqualTo("Summary text");
    assertThat(result.stepByStep()).isEqualTo(STEPS);
    assertThat(result.concepts()).isEqualTo(CONCEPTS);
    assertThat(result.bestPractices()).isEqualTo(PRACTICES);
  }

  @Test
  void toResponse_roundTripsCorrectly() {
    CodeSnippet snippet = mock(CodeSnippet.class);
    ExplanationResponse original =
        new ExplanationResponse("Round trip", STEPS, CONCEPTS, PRACTICES);

    SnippetExplanation entity = new SnippetExplanation(snippet, original);
    ExplanationResponse result = entity.toResponse();

    assertThat(result).isEqualTo(original);
  }
}
