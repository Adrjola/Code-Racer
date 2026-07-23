package org.coderacer.backend.controller;

import jakarta.validation.Valid;
import java.time.Clock;
import java.time.Instant;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.coderacer.backend.dto.AbandonResponse;
import org.coderacer.backend.dto.BaseResponse;
import org.coderacer.backend.dto.GlobalLeaderboardResponse;
import org.coderacer.backend.dto.PersonalStatisticsResponse;
import org.coderacer.backend.dto.ProgressAckResponse;
import org.coderacer.backend.dto.SnippetStatisticsResponse;
import org.coderacer.backend.dto.SoloAttemptRankingResponse;
import org.coderacer.backend.dto.SoloAttemptResultResponse;
import org.coderacer.backend.dto.StartSoloAttemptRequest;
import org.coderacer.backend.dto.StartSoloAttemptResponse;
import org.coderacer.backend.dto.SubmitProgressRequest;
import org.coderacer.backend.dto.WorldBestResponse;
import org.coderacer.backend.enums.Category;
import org.coderacer.backend.enums.Difficulty;
import org.coderacer.backend.enums.SoloAttemptState;
import org.coderacer.backend.mapper.SoloAttemptMapper;
import org.coderacer.backend.model.SoloAttempt;
import org.coderacer.backend.security.CurrentJwtUserProvider;
import org.coderacer.backend.service.GlobalLeaderboardService;
import org.coderacer.backend.service.PersonalStatisticsService;
import org.coderacer.backend.service.ProgressResult;
import org.coderacer.backend.service.SnippetStatisticsService;
import org.coderacer.backend.service.SoloAttemptHistoryService;
import org.coderacer.backend.service.SoloAttemptRankingService;
import org.coderacer.backend.service.SoloAttemptService;
import org.coderacer.backend.service.WorldBestService;
import org.slf4j.MDC;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PagedModel;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/solo-attempts")
@RequiredArgsConstructor
public class SoloAttemptController {

  private final SoloAttemptService soloAttemptService;
  private final SoloAttemptHistoryService historyService;
  private final PersonalStatisticsService statisticsService;
  private final GlobalLeaderboardService globalLeaderboardService;
  private final WorldBestService worldBestService;
  private final SnippetStatisticsService snippetStatisticsService;
  private final SoloAttemptRankingService rankingService;
  private final CurrentJwtUserProvider currentJwtUserProvider;
  private final SoloAttemptMapper mapper;
  private final Clock clock;

  @GetMapping
  public BaseResponse<PagedModel<SoloAttemptResultResponse>> history(
      @RequestParam(required = false) SoloAttemptState state,
      @RequestParam(required = false) Category category,
      @RequestParam(required = false) Difficulty difficulty,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
          Instant startedFrom,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
          Instant startedTo,
      Pageable pageable) {
    UUID userId = currentJwtUserProvider.resolve();
    Page<SoloAttemptResultResponse> history =
        historyService.findHistory(
            userId, state, category, difficulty, startedFrom, startedTo, pageable);
    return new BaseResponse<>(new PagedModel<>(history), MDC.get("correlationId"));
  }

  @PostMapping
  public ResponseEntity<BaseResponse<StartSoloAttemptResponse>> start(
      @Valid @RequestBody StartSoloAttemptRequest request) {
    UUID userId = currentJwtUserProvider.resolve();
    SoloAttempt attempt = soloAttemptService.start(userId, request.codeSnippetId());
    StartSoloAttemptResponse response =
        new StartSoloAttemptResponse(
            attempt.getId(),
            attempt.getCodeSnippet().getId(),
            attempt.getDifficulty(),
            attempt.getStartedAt(),
            clock.instant());
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(new BaseResponse<>(response, MDC.get("correlationId")));
  }

  @PostMapping("/{id}/progress")
  public ResponseEntity<BaseResponse<?>> submitProgress(
      @PathVariable UUID id, @Valid @RequestBody SubmitProgressRequest request) {
    UUID userId = currentJwtUserProvider.resolve();
    ProgressResult result =
        soloAttemptService.submitProgress(id, userId, request.sequence(), request.characters());

    if (result.attempt().getState() == SoloAttemptState.COMPLETED) {
      return ResponseEntity.ok(
          new BaseResponse<>(mapper.toResultResponse(result.attempt()), MDC.get("correlationId")));
    }
    ProgressAckResponse response =
        new ProgressAckResponse(
            result.attempt().getId(), result.attempt().getState(), result.acceptedOffset());
    return ResponseEntity.ok(new BaseResponse<>(response, MDC.get("correlationId")));
  }

  @PostMapping("/{id}/abandon")
  public ResponseEntity<BaseResponse<AbandonResponse>> abandon(@PathVariable UUID id) {
    UUID userId = currentJwtUserProvider.resolve();
    SoloAttempt attempt = soloAttemptService.abandon(id, userId);
    AbandonResponse response = new AbandonResponse(attempt.getId(), attempt.getState());
    return ResponseEntity.ok(new BaseResponse<>(response, MDC.get("correlationId")));
  }

  @GetMapping("/statistics")
  public BaseResponse<PersonalStatisticsResponse> statistics() {
    UUID userId = currentJwtUserProvider.resolve();
    return new BaseResponse<>(statisticsService.forUser(userId), MDC.get("correlationId"));
  }

  @GetMapping("/global-leaderboard")
  public BaseResponse<GlobalLeaderboardResponse> globalLeaderboard(
      @RequestParam Difficulty difficulty, @RequestParam(defaultValue = "20") int limit) {
    return new BaseResponse<>(
        globalLeaderboardService.forDifficulty(difficulty, limit), MDC.get("correlationId"));
  }

  @GetMapping("/world-best")
  public BaseResponse<WorldBestResponse> worldBest(@RequestParam UUID snippetId) {
    return new BaseResponse<>(worldBestService.forSnippet(snippetId), MDC.get("correlationId"));
  }

  @GetMapping("/snippet-statistics")
  public BaseResponse<SnippetStatisticsResponse> snippetStatistics() {
    UUID userId = currentJwtUserProvider.resolve();
    return new BaseResponse<>(
        new SnippetStatisticsResponse(snippetStatisticsService.forUser(userId)),
        MDC.get("correlationId"));
  }

  @GetMapping("/{id}/ranking")
  public BaseResponse<SoloAttemptRankingResponse> ranking(@PathVariable UUID id) {
    UUID userId = currentJwtUserProvider.resolve();
    return new BaseResponse<>(rankingService.forAttempt(id, userId), MDC.get("correlationId"));
  }

  @GetMapping("/{id}")
  public BaseResponse<?> getById(@PathVariable UUID id) {
    UUID userId = currentJwtUserProvider.resolve();
    SoloAttempt attempt = soloAttemptService.getById(id, userId);
    return new BaseResponse<>(mapper.toResultResponse(attempt), MDC.get("correlationId"));
  }
}
