package org.coderacer.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.coderacer.backend.dto.ExplanationResponse;
import org.coderacer.backend.enums.Category;
import org.coderacer.backend.enums.Difficulty;
import org.coderacer.backend.enums.SnippetLifecycle;
import org.coderacer.backend.exception.AiProviderException;
import org.coderacer.backend.exception.ResourceNotFoundException;
import org.coderacer.backend.model.CodeSnippet;
import org.coderacer.backend.model.SnippetExplanation;
import org.coderacer.backend.repository.CodeSnippetRepository;
import org.coderacer.backend.repository.SnippetExplanationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class ExplanationServiceTest {

  @Mock private CodeSnippetRepository codeSnippetRepository;
  @Mock private SnippetExplanationRepository explanationRepository;
  @Mock private AiProvider aiProvider;

  private ExplanationService service;
  private final UUID snippetId = UUID.randomUUID();

  @BeforeEach
  void setUp() {
    service =
        new ExplanationService(
            codeSnippetRepository, explanationRepository, Optional.of(aiProvider));
  }

  private CodeSnippet snippet() {
    CodeSnippet snippet =
        new CodeSnippet(
            "Hello World",
            "System.out.println(\"Hello\");",
            "hash",
            Difficulty.EASY,
            Category.JAVA);
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

  @Nested
  class GenerateAndSave {

    @Test
    void returnsResponseForActiveSnippet() {
      when(codeSnippetRepository.findById(snippetId)).thenReturn(Optional.of(snippet()));
      when(explanationRepository.findBySnippetId(snippetId)).thenReturn(Optional.empty());
      when(aiProvider.explain("System.out.println(\"Hello\");")).thenReturn(validResponse());

      ExplanationResponse result = service.generateAndSave(snippetId);

      assertThat(result.summary()).isEqualTo("This code prints Hello to the console.");
      assertThat(result.stepByStep()).hasSize(2);
      assertThat(result.concepts()).hasSize(2);
      assertThat(result.bestPractices()).hasSize(1);
      verify(explanationRepository).save(any(SnippetExplanation.class));
    }

    @Test
    void throwsNotFoundWhenSnippetMissing() {
      when(codeSnippetRepository.findById(snippetId)).thenReturn(Optional.empty());

      assertThrows(ResourceNotFoundException.class, () -> service.generateAndSave(snippetId));
    }

    @Test
    void throwsNotFoundWhenSnippetDeleted() {
      when(codeSnippetRepository.findById(snippetId)).thenReturn(Optional.of(deletedSnippet()));

      assertThrows(ResourceNotFoundException.class, () -> service.generateAndSave(snippetId));
    }

    @Test
    void throwsWhenExplanationAlreadyExists() {
      when(codeSnippetRepository.findById(snippetId)).thenReturn(Optional.of(snippet()));
      when(explanationRepository.findBySnippetId(snippetId))
          .thenReturn(Optional.of(new SnippetExplanation(snippet(), validResponse())));

      assertThrows(IllegalStateException.class, () -> service.generateAndSave(snippetId));
    }

    @Test
    void throwsDisabledWhenNoProvider() {
      ExplanationService disabledService =
          new ExplanationService(codeSnippetRepository, explanationRepository, Optional.empty());

      assertThrows(AiProviderException.class, () -> disabledService.generateAndSave(snippetId));
      verifyNoInteractions(codeSnippetRepository);
    }

    @Test
    void throwsInvalidResponseWhenNull() {
      when(codeSnippetRepository.findById(snippetId)).thenReturn(Optional.of(snippet()));
      when(explanationRepository.findBySnippetId(snippetId)).thenReturn(Optional.empty());
      when(aiProvider.explain("System.out.println(\"Hello\");")).thenReturn(null);

      AiProviderException ex =
          assertThrows(AiProviderException.class, () -> service.generateAndSave(snippetId));
      assertThat(ex.getCode()).isEqualTo("AI_PROVIDER_INVALID_RESPONSE");
    }

    @Test
    void throwsInvalidResponseWhenMalformed() {
      ExplanationResponse malformed = new ExplanationResponse("", List.of(), List.of(), List.of());
      when(codeSnippetRepository.findById(snippetId)).thenReturn(Optional.of(snippet()));
      when(explanationRepository.findBySnippetId(snippetId)).thenReturn(Optional.empty());
      when(aiProvider.explain("System.out.println(\"Hello\");")).thenReturn(malformed);

      AiProviderException ex =
          assertThrows(AiProviderException.class, () -> service.generateAndSave(snippetId));
      assertThat(ex.getCode()).isEqualTo("AI_PROVIDER_INVALID_RESPONSE");
    }

    @Test
    void propagatesProviderTimeout() {
      when(codeSnippetRepository.findById(snippetId)).thenReturn(Optional.of(snippet()));
      when(explanationRepository.findBySnippetId(snippetId)).thenReturn(Optional.empty());
      when(aiProvider.explain("System.out.println(\"Hello\");"))
          .thenThrow(AiProviderException.timeout(new RuntimeException("timed out")));

      assertThrows(AiProviderException.class, () -> service.generateAndSave(snippetId));
    }
  }

  @Nested
  class GetExplanation {

    @Test
    void returnsStoredExplanation() {
      SnippetExplanation entity = new SnippetExplanation(snippet(), validResponse());
      when(explanationRepository.findBySnippetId(snippetId)).thenReturn(Optional.of(entity));

      ExplanationResponse result = service.getExplanation(snippetId);

      assertThat(result.summary()).isEqualTo("This code prints Hello to the console.");
      assertThat(result.stepByStep()).hasSize(2);
    }

    @Test
    void throwsNotFoundWhenNoExplanation() {
      when(explanationRepository.findBySnippetId(snippetId)).thenReturn(Optional.empty());

      assertThrows(ResourceNotFoundException.class, () -> service.getExplanation(snippetId));
    }
  }
}
