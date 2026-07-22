package org.coderacer.backend.service;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.coderacer.backend.dto.ExplanationResponse;
import org.coderacer.backend.enums.SnippetLifecycle;
import org.coderacer.backend.exception.AiProviderException;
import org.coderacer.backend.exception.ResourceNotFoundException;
import org.coderacer.backend.model.CodeSnippet;
import org.coderacer.backend.repository.CodeSnippetRepository;
import org.springframework.stereotype.Service;

@Service
public class ExplanationService {

  private final CodeSnippetRepository codeSnippetRepository;
  private final AiProvider aiProvider;
  private final Map<UUID, ExplanationResponse> cache = new ConcurrentHashMap<>();

  public ExplanationService(
      CodeSnippetRepository codeSnippetRepository, Optional<AiProvider> aiProvider) {
    this.codeSnippetRepository = codeSnippetRepository;
    this.aiProvider = aiProvider.orElse(null);
  }

  public ExplanationResponse explain(UUID snippetId) {
    if (aiProvider == null) {
      throw AiProviderException.disabled();
    }

    ExplanationResponse cached = cache.get(snippetId);
    if (cached != null) {
      return cached;
    }

    CodeSnippet snippet =
        codeSnippetRepository
            .findById(snippetId)
            .orElseThrow(() -> new ResourceNotFoundException("Snippet not found: " + snippetId));

    if (snippet.getLifecycle() != SnippetLifecycle.ACTIVE) {
      throw new ResourceNotFoundException("Snippet is not available: " + snippetId);
    }

    ExplanationResponse response = aiProvider.explain(snippet.getSource());

    if (response == null || !response.isValid()) {
      throw AiProviderException.invalidResponse("malformed or incomplete explanation");
    }

    cache.put(snippetId, response);
    return response;
  }
}
