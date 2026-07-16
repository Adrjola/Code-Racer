package org.coderacer.backend.snippet.mapper;

import org.coderacer.backend.snippet.dto.SnippetResponse;
import org.coderacer.backend.snippet.model.CodeSnippet;
import org.springframework.stereotype.Component;

@Component
public class SnippetMapper {

  public SnippetResponse toResponse(CodeSnippet snippet) {
    return new SnippetResponse(
        snippet.getId(),
        snippet.getSnippetId(),
        snippet.getRevisionNumber(),
        snippet.getTitle(),
        snippet.getSource(),
        snippet.getDifficulty(),
        snippet.getLifecycle(),
        snippet.getCategory().getId(),
        snippet.getCreatedAt(),
        snippet.getUpdatedAt(),
        snippet.getVersion());
  }
}
