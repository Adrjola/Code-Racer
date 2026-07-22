package org.coderacer.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.coderacer.backend.dto.ExplanationResponse;
import org.coderacer.backend.enums.Difficulty;
import org.coderacer.backend.enums.SnippetLifecycle;
import org.coderacer.backend.exception.AiProviderException;
import org.coderacer.backend.exception.ResourceNotFoundException;
import org.coderacer.backend.model.Category;
import org.coderacer.backend.model.CodeSnippet;
import org.coderacer.backend.repository.CodeSnippetRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class ExplanationServiceTest {

  @Mock private CodeSnippetRepository codeSnippetRepository;
  @Mock private AiProvider aiProvider;

  private ExplanationService service;

  private final UUID snippetId = UUID.randomUUID();

  @BeforeEach
  void setUp() {
    service = new ExplanationService(codeSnippetRepository, aiProvider);
  }

  private Category category() {
    Category category = new Category();
    category.setId(UUID.randomUUID());
    category.setName("Java");
    category.setActive(true);
    return category;
  }

  private CodeSnippet snippet() {
    CodeSnippet snippet =
        new CodeSnippet(
            "Hello World", "System.out.println(\"Hello\");", "hash", Difficulty.EASY, category());
    ReflectionTestUtils.setField(snippet, "id", snippetId);
    return snippet;
  }

  private CodeSnippet deletedSnippet() {
    CodeSnippet snippet = snippet();
    ReflectionTestUtils.setField(snippet, "lifecycle", SnippetLifecycle.DELETED);
    return snippet;
  }

  private ExplanationResponse validResponse() {
    return new ExplanationResponse(
        "This code prints Hello to the console.",
        List.of("Calls System.out.println", "Prints the string"),
        List.of("Standard output", "String literals"),
        List.of("Use a logger instead of System.out"));
  }

  @Test
  void explainReturnsResponseForActiveSnippet() {
    when(codeSnippetRepository.findById(snippetId)).thenReturn(Optional.of(snippet()));
    when(aiProvider.explain("System.out.println(\"Hello\");")).thenReturn(validResponse());

    ExplanationResponse result = service.explain(snippetId);

    assertThat(result.summary()).isEqualTo("This code prints Hello to the console.");
    assertThat(result.stepByStep()).hasSize(2);
    assertThat(result.concepts()).hasSize(2);
    assertThat(result.bestPractices()).hasSize(1);
  }

  @Test
  void explainThrowsNotFoundWhenSnippetMissing() {
    when(codeSnippetRepository.findById(snippetId)).thenReturn(Optional.empty());

    assertThrows(ResourceNotFoundException.class, () -> service.explain(snippetId));
  }

  @Test
  void explainThrowsNotFoundWhenSnippetDeleted() {
    when(codeSnippetRepository.findById(snippetId)).thenReturn(Optional.of(deletedSnippet()));

    assertThrows(ResourceNotFoundException.class, () -> service.explain(snippetId));
  }

  @Test
  void explainPropagatesProviderDisabled() {
    when(codeSnippetRepository.findById(snippetId)).thenReturn(Optional.of(snippet()));
    when(aiProvider.explain("System.out.println(\"Hello\");"))
        .thenThrow(AiProviderException.disabled());

    assertThrows(AiProviderException.class, () -> service.explain(snippetId));
  }

  @Test
  void explainPropagatesProviderTimeout() {
    when(codeSnippetRepository.findById(snippetId)).thenReturn(Optional.of(snippet()));
    when(aiProvider.explain("System.out.println(\"Hello\");"))
        .thenThrow(AiProviderException.timeout(new RuntimeException("timed out")));

    assertThrows(AiProviderException.class, () -> service.explain(snippetId));
  }

  @Test
  void explainThrowsInvalidResponseWhenNull() {
    when(codeSnippetRepository.findById(snippetId)).thenReturn(Optional.of(snippet()));
    when(aiProvider.explain("System.out.println(\"Hello\");")).thenReturn(null);

    AiProviderException ex =
        assertThrows(AiProviderException.class, () -> service.explain(snippetId));
    assertThat(ex.getCode()).isEqualTo("AI_PROVIDER_INVALID_RESPONSE");
  }

  @Test
  void explainThrowsInvalidResponseWhenMalformed() {
    ExplanationResponse malformed = new ExplanationResponse("", List.of(), List.of(), List.of());
    when(codeSnippetRepository.findById(snippetId)).thenReturn(Optional.of(snippet()));
    when(aiProvider.explain("System.out.println(\"Hello\");")).thenReturn(malformed);

    AiProviderException ex =
        assertThrows(AiProviderException.class, () -> service.explain(snippetId));
    assertThat(ex.getCode()).isEqualTo("AI_PROVIDER_INVALID_RESPONSE");
  }
}
