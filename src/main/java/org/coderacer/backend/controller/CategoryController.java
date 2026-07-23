package org.coderacer.backend.controller;

import java.util.List;
import java.util.stream.Stream;
import org.coderacer.backend.dto.BaseResponse;
import org.coderacer.backend.dto.CategoryResponse;
import org.coderacer.backend.enums.Category;
import org.slf4j.MDC;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/categories")
public class CategoryController {

  /** The catalog is a fixed enum, so this is a constant list rather than a query. */
  @GetMapping
  public BaseResponse<List<CategoryResponse>> list() {
    List<CategoryResponse> categories =
        Stream.of(Category.values())
            .map(category -> new CategoryResponse(category, category.getDisplayName()))
            .toList();
    return new BaseResponse<>(categories, MDC.get("correlationId"));
  }
}
