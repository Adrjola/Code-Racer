package org.coderacer.backend.dto;

import org.coderacer.backend.enums.Category;

public record CategoryResponse(Category category, String displayName) {}
