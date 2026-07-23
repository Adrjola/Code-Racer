package org.coderacer.backend.controller;

import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.coderacer.backend.dto.BaseResponse;
import org.coderacer.backend.dto.ExplanationResponse;
import org.coderacer.backend.service.ExplanationService;
import org.slf4j.MDC;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/snippets")
@RequiredArgsConstructor
public class AdminExplanationController {

  private final ExplanationService explanationService;

  @GetMapping("/{id}/explanation")
  public BaseResponse<ExplanationResponse> get(@PathVariable UUID id) {
    return new BaseResponse<>(explanationService.getExplanation(id), MDC.get("correlationId"));
  }

  @PostMapping("/{id}/explanation")
  public BaseResponse<ExplanationResponse> generate(@PathVariable UUID id) {
    return new BaseResponse<>(explanationService.generateAndSave(id), MDC.get("correlationId"));
  }
}
