package org.coderacer.backend.service;

import java.util.Optional;
import java.util.UUID;
import org.coderacer.backend.dto.ExplanationResponse;
import org.coderacer.backend.enums.SnippetLifecycle;
import org.coderacer.backend.exception.AiProviderException;
import org.coderacer.backend.exception.ResourceNotFoundException;
import org.coderacer.backend.model.CodeSnippet;
import org.coderacer.backend.model.SnippetExplanation;
import org.coderacer.backend.repository.CodeSnippetRepository;
import org.coderacer.backend.repository.SnippetExplanationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ExplanationService {

  private final CodeSnippetRepository codeSnippetRepository;
  private final SnippetExplanationRepository explanationRepository;
  private final AiProvider aiProvider;

  public ExplanationService(
      CodeSnippetRepository codeSnippetRepository,
      SnippetExplanationRepository explanationRepository,
      Optional<AiProvider> aiProvider) {
    this.codeSnippetRepository = codeSnippetRepository;
    this.explanationRepository = explanationRepository;
    this.aiProvider = aiProvider.orElse(null);
  }

  /** Admin action: calls AI, persists the result. */
  @Transactional
  public ExplanationResponse generateAndSave(UUID snippetId) {
    if (aiProvider == null) {
      throw AiProviderException.disabled();
    }

    CodeSnippet snippet =
        codeSnippetRepository
            .findById(snippetId)
            .orElseThrow(() -> new ResourceNotFoundException("Snippet not found: " + snippetId));

    if (snippet.getLifecycle() != SnippetLifecycle.ACTIVE) {
      throw new ResourceNotFoundException("Snippet is not available: " + snippetId);
    }

    explanationRepository
        .findBySnippetId(snippetId)
        .ifPresent(
            existing -> {
              explanationRepository.delete(existing);
              explanationRepository.flush();
            });

    ExplanationResponse response = aiProvider.explain(snippet.getSource());
    if (response == null || !response.isValid()) {
      throw AiProviderException.invalidResponse("malformed or incomplete explanation");
    }

    SnippetExplanation entity = new SnippetExplanation(snippet, response);
    explanationRepository.save(entity);
    return response;
  }

  /** User action: reads pre-generated explanation from DB. */
  @Transactional(readOnly = true)
  public ExplanationResponse getExplanation(UUID snippetId) {
    SnippetExplanation explanation =
        explanationRepository
            .findBySnippetId(snippetId)
            .orElseThrow(
                () ->
                    new ResourceNotFoundException(
                        "No explanation available for snippet: " + snippetId));
    return explanation.toResponse();
  }
}
