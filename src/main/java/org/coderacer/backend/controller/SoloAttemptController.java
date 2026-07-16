package org.coderacer.backend.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.UUID;
import org.coderacer.backend.dto.*;
import org.coderacer.backend.identity.CurrentUserProvider;
import org.coderacer.backend.model.SoloAttempt;
import org.coderacer.backend.model.SoloAttemptState;
import org.coderacer.backend.service.ProgressResult;
import org.coderacer.backend.service.SoloAttemptService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/solo-attempts")
public class SoloAttemptController {

  private final SoloAttemptService soloAttemptService;
  private final CurrentUserProvider currentUserProvider;

  public SoloAttemptController(
      SoloAttemptService soloAttemptService, CurrentUserProvider currentUserProvider) {
    this.soloAttemptService = soloAttemptService;
    this.currentUserProvider = currentUserProvider;
  }

  @PostMapping
  public ResponseEntity<StartSoloAttemptResponse> start(
      @Valid @RequestBody StartSoloAttemptRequest request, HttpServletRequest httpRequest) {
    UUID userId = currentUserProvider.resolve(httpRequest);
    SoloAttempt attempt = soloAttemptService.start(userId, request.codeSnippetId());
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(
            new StartSoloAttemptResponse(
                attempt.getId(),
                attempt.getCodeSnippet().getId(),
                attempt.getDifficulty(),
                attempt.getStartedAt()));
  }

  @PostMapping("/{id}/progress")
  public ResponseEntity<?> submitProgress(
      @PathVariable UUID id,
      @Valid @RequestBody SubmitProgressRequest request,
      HttpServletRequest httpRequest) {
    UUID userId = currentUserProvider.resolve(httpRequest);
    ProgressResult result =
        soloAttemptService.submitProgress(id, userId, request.sequence(), request.characters());
    if (result.attempt().getState() == SoloAttemptState.COMPLETED) {
      return ResponseEntity.ok(SoloAttemptResponseMapper.toResultResponse(result.attempt()));
    }
    return ResponseEntity.ok(
        new ProgressAckResponse(
            result.attempt().getId(), result.attempt().getState(), result.acceptedOffset()));
  }

  @PostMapping("/{id}/abandon")
  public ResponseEntity<AbandonResponse> abandon(
      @PathVariable UUID id, HttpServletRequest httpRequest) {
    UUID userId = currentUserProvider.resolve(httpRequest);
    SoloAttempt attempt = soloAttemptService.abandon(id, userId);
    return ResponseEntity.ok(new AbandonResponse(attempt.getId(), attempt.getState()));
  }

  @GetMapping("/{id}")
  public ResponseEntity<SoloAttemptResultResponse> getById(
      @PathVariable UUID id, HttpServletRequest httpRequest) {
    UUID userId = currentUserProvider.resolve(httpRequest);
    SoloAttempt attempt = soloAttemptService.getById(id, userId);
    return ResponseEntity.ok(SoloAttemptResponseMapper.toResultResponse(attempt));
  }
}
