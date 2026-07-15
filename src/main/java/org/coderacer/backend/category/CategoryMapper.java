package org.coderacer.backend.category;

import org.coderacer.backend.category.dto.CategoryResponse;
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
