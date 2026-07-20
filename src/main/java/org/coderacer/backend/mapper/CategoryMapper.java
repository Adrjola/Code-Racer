package org.coderacer.backend.mapper;

import org.coderacer.backend.dto.CategoryResponse;
import org.coderacer.backend.model.Category;
import org.springframework.stereotype.Component;

@Component
public class CategoryMapper {

  public CategoryResponse toResponse(Category category) {
    return new CategoryResponse(
        category.getId(),
        category.getName(),
        category.getDescription(),
        category.isActive(),
        category.getCreatedAt(),
        category.getUpdatedAt());
  }
}
