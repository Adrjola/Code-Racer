package org.coderacer.backend.soloattempt.dto;

import java.util.UUID;

public record SoloAttemptSnippetSummary(
    UUID revisionId, UUID snippetId, int revisionNumber, String title, UUID categoryId) {}
