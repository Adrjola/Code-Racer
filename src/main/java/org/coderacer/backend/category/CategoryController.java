package org.coderacer.backend.category;

import lombok.RequiredArgsConstructor;
import org.coderacer.backend.category.dto.CategoryResponse;
import org.coderacer.backend.common.dto.BaseResponse;
import org.slf4j.MDC;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/categories")
@RequiredArgsConstructor
public class CategoryController {

  private final CategoryService service;

  @GetMapping
  public BaseResponse<Page<CategoryResponse>> listActive(Pageable pageable) {
    return new BaseResponse<>(service.listActive(pageable), MDC.get("correlationId"));
  }
}
