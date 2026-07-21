package org.coderacer.backend.controller;

import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.coderacer.backend.dto.BaseResponse;
import org.coderacer.backend.dto.CreateSnippetRequest;
import org.coderacer.backend.dto.SnippetResponse;
import org.coderacer.backend.enums.Difficulty;
import org.coderacer.backend.enums.SnippetLifecycle;
import org.coderacer.backend.service.SnippetService;
import org.slf4j.MDC;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PagedModel;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/snippets")
@RequiredArgsConstructor
public class AdminSnippetController {

  private final SnippetService service;

  @PostMapping
  public ResponseEntity<BaseResponse<SnippetResponse>> create(
      @Valid @RequestBody CreateSnippetRequest request) {
    return ResponseEntity.status(HttpStatus.CREATED).body(wrap(service.create(request)));
  }

  @GetMapping
  public BaseResponse<PagedModel<SnippetResponse>> list(
      @RequestParam(required = false) UUID categoryId,
      @RequestParam(required = false) Difficulty difficulty,
      @RequestParam(required = false) SnippetLifecycle lifecycle,
      Pageable pageable) {
    return wrap(new PagedModel<>(service.list(categoryId, difficulty, lifecycle, pageable)));
  }

  @GetMapping("/{id}")
  public BaseResponse<SnippetResponse> get(@PathVariable UUID id) {
    return wrap(service.getById(id));
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(@PathVariable UUID id) {
    service.delete(id);
    return ResponseEntity.noContent().build();
  }

  private <T> BaseResponse<T> wrap(T data) {
    return new BaseResponse<>(data, MDC.get("correlationId"));
  }
}
