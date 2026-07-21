package org.coderacer.backend.dto;

import java.util.UUID;

public record SoloAttemptSnippetSummary(UUID snippetId, String title, UUID categoryId) {}
