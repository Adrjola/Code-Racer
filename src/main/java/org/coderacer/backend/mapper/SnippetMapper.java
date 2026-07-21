package org.coderacer.backend.mapper;

import org.coderacer.backend.dto.SnippetResponse;
import org.coderacer.backend.model.CodeSnippet;
import org.springframework.stereotype.Component;

@Component
public class SnippetMapper {

  public SnippetResponse toResponse(CodeSnippet snippet) {
    return new SnippetResponse(
        snippet.getId(),
        snippet.getTitle(),
        snippet.getSource(),
        snippet.getDifficulty(),
        snippet.getLifecycle(),
        snippet.getCategory().getId(),
        snippet.getCreatedAt(),
        snippet.getUpdatedAt());
  }
}
