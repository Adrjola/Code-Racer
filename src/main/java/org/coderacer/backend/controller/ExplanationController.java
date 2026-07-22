package org.coderacer.backend.controller;

import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.coderacer.backend.dto.BaseResponse;
import org.coderacer.backend.dto.ExplanationResponse;
import org.coderacer.backend.service.ExplanationService;
import org.slf4j.MDC;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/snippets")
@RequiredArgsConstructor
public class ExplanationController {

  private final ExplanationService explanationService;

  @GetMapping("/{id}/explanation")
  public BaseResponse<ExplanationResponse> explain(@PathVariable UUID id) {
    return new BaseResponse<>(explanationService.explain(id), MDC.get("correlationId"));
  }
}
