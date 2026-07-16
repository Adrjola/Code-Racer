package org.coderacer.backend.repository;

import java.util.UUID;
import org.coderacer.backend.model.CodeSnippet;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CodeSnippetRepository extends JpaRepository<CodeSnippet, UUID> {}
