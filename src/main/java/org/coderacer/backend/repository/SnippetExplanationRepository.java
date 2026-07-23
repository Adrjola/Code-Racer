package org.coderacer.backend.repository;

import java.util.Optional;
import java.util.UUID;
import org.coderacer.backend.model.SnippetExplanation;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SnippetExplanationRepository extends JpaRepository<SnippetExplanation, UUID> {
  Optional<SnippetExplanation> findBySnippetId(UUID snippetId);
}
