package org.coderacer.backend.dto;

import java.util.UUID;
import org.coderacer.backend.enums.Category;

public record SoloAttemptSnippetSummary(UUID snippetId, String title, Category category) {}
