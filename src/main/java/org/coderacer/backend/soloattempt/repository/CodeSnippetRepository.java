package org.coderacer.backend.soloattempt.repository;

import java.util.UUID;
import org.coderacer.backend.soloattempt.model.CodeSnippet;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CodeSnippetRepository extends JpaRepository<CodeSnippet, UUID> {}
