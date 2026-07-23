package org.coderacer.backend.controller;

import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.coderacer.backend.dto.BaseResponse;
import org.coderacer.backend.dto.SnippetResponse;
import org.coderacer.backend.enums.Category;
import org.coderacer.backend.enums.Difficulty;
import org.coderacer.backend.service.SnippetService;
import org.slf4j.MDC;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/snippets")
@RequiredArgsConstructor
public class SnippetController {

  private final SnippetService service;

  @GetMapping("/random")
  public BaseResponse<SnippetResponse> random(
      @RequestParam(required = false) Category category,
      @RequestParam(required = false) Difficulty difficulty,
      @RequestParam(required = false) UUID excludeId) {
    return new BaseResponse<>(
        service.randomEligible(category, difficulty, excludeId), MDC.get("correlationId"));
  }
}
