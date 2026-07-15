package org.coderacer.backend.category;

import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.coderacer.backend.category.dto.CategoryRequest;
import org.coderacer.backend.category.dto.CategoryResponse;
import org.coderacer.backend.common.dto.BaseResponse;
import org.slf4j.MDC;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/categories")
@RequiredArgsConstructor
public class AdminCategoryController {

  private final CategoryService service;

  @PostMapping
  public ResponseEntity<BaseResponse<CategoryResponse>> create(
      @Valid @RequestBody CategoryRequest request) {
    return ResponseEntity.status(HttpStatus.CREATED).body(wrap(service.create(request)));
  }

  @GetMapping
  public BaseResponse<Page<CategoryResponse>> list(Pageable pageable) {
    return wrap(service.list(pageable));
  }

  @GetMapping("/{id}")
  public BaseResponse<CategoryResponse> get(@PathVariable UUID id) {
    return wrap(service.getById(id));
  }

  @PutMapping("/{id}")
  public BaseResponse<CategoryResponse> update(
      @PathVariable UUID id, @Valid @RequestBody CategoryRequest request) {
    return wrap(service.update(id, request));
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(@PathVariable UUID id) {
    service.delete(id);
    return ResponseEntity.noContent().build();
  }

  @PostMapping("/{id}/restore")
  public BaseResponse<CategoryResponse> restore(@PathVariable UUID id) {
    return wrap(service.restore(id));
  }

  private <T> BaseResponse<T> wrap(T data) {
    return new BaseResponse<>(data, MDC.get("correlationId"));
  }
}
