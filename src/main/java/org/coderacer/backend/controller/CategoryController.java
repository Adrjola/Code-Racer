package org.coderacer.backend.controller;

import lombok.RequiredArgsConstructor;
import org.coderacer.backend.dto.BaseResponse;
import org.coderacer.backend.dto.CategoryResponse;
import org.coderacer.backend.service.CategoryService;
import org.slf4j.MDC;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PagedModel;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/categories")
@RequiredArgsConstructor
public class CategoryController {

  private final CategoryService service;

  @GetMapping
  public BaseResponse<PagedModel<CategoryResponse>> listActive(Pageable pageable) {
    return new BaseResponse<>(
        new PagedModel<>(service.listActive(pageable)), MDC.get("correlationId"));
  }
}
