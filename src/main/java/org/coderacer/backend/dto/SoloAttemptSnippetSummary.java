package org.coderacer.backend.dto;

import java.util.UUID;

public record SoloAttemptSnippetSummary(
    UUID revisionId, UUID snippetId, int revisionNumber, String title, UUID categoryId) {}
