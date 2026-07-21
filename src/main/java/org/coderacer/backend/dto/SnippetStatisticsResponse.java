package org.coderacer.backend.dto;

import java.util.List;

/**
 * The authenticated user's personal-best run per snippet, across every difficulty, ordered by how
 * recently each best was set.
 */
public record SnippetStatisticsResponse(List<SnippetStatistics> snippets) {}
