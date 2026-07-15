package org.coderacer.backend.category.mapper;

import org.coderacer.backend.category.dto.CategoryResponse;
import org.coderacer.backend.category.model.Category;
import org.springframework.stereotype.Component;

/** Maps {@link Category} entities to response DTOs. */
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
