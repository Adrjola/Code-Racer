package org.coderacer.backend.controller;

import jakarta.servlet.http.HttpServletRequest;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.coderacer.backend.dto.AdminUserResponse;
import org.coderacer.backend.dto.BaseResponse;
import org.coderacer.backend.enums.UserRole;
import org.coderacer.backend.security.CurrentUserProvider;
import org.coderacer.backend.service.AdminUserService;
import org.slf4j.MDC;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PagedModel;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
public class AdminUserController {

  private final AdminUserService service;
  private final CurrentUserProvider currentUserProvider;

  @GetMapping
  public BaseResponse<PagedModel<AdminUserResponse>> list(
      @RequestParam(required = false) UserRole role,
      @RequestParam(required = false) Boolean emailVerified,
      @RequestParam(required = false) Boolean deleted,
      Pageable pageable) {
    return wrap(new PagedModel<>(service.list(role, emailVerified, deleted, pageable)));
  }

  @GetMapping("/{id}")
  public BaseResponse<AdminUserResponse> get(@PathVariable UUID id) {
    return wrap(service.getById(id));
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(@PathVariable UUID id, HttpServletRequest request) {
    service.delete(id, currentUserProvider.resolve(request));
    return ResponseEntity.noContent().build();
  }

  @PostMapping("/{id}/restore")
  public BaseResponse<AdminUserResponse> restore(@PathVariable UUID id) {
    return wrap(service.restore(id));
  }

  private <T> BaseResponse<T> wrap(T data) {
    return new BaseResponse<>(data, MDC.get("correlationId"));
  }
}
