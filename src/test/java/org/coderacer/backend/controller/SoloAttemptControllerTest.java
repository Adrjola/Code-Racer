package org.coderacer.backend.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.coderacer.backend.dto.DifficultyGlobalStatistics;
import org.coderacer.backend.dto.DifficultyStatistics;
import org.coderacer.backend.dto.FastestTimeRecord;
import org.coderacer.backend.dto.GlobalStatisticsResponse;
import org.coderacer.backend.dto.HighestCpmRecord;
import org.coderacer.backend.dto.PersonalStatisticsResponse;
import org.coderacer.backend.dto.SoloAttemptRankingResponse;
import org.coderacer.backend.dto.SoloAttemptResultResponse;
import org.coderacer.backend.dto.SoloAttemptSnippetSummary;
import org.coderacer.backend.enums.Difficulty;
import org.coderacer.backend.enums.SoloAttemptState;
import org.coderacer.backend.exception.GlobalExceptionHandler;
import org.coderacer.backend.exception.OneActiveAttemptConflictException;
import org.coderacer.backend.exception.SoloAttemptNotActiveException;
import org.coderacer.backend.exception.SoloAttemptNotFoundException;
import org.coderacer.backend.exception.SoloAttemptOwnershipException;
import org.coderacer.backend.exception.ValidationException;
import org.coderacer.backend.mapper.SoloAttemptMapper;
import org.coderacer.backend.model.Category;
import org.coderacer.backend.model.CodeSnippet;
import org.coderacer.backend.model.SoloAttempt;
import org.coderacer.backend.model.User;
import org.coderacer.backend.security.CurrentUserProvider;
import org.coderacer.backend.service.GlobalStatisticsService;
import org.coderacer.backend.service.PersonalStatisticsService;
import org.coderacer.backend.service.ProgressResult;
import org.coderacer.backend.service.SoloAttemptHistoryService;
import org.coderacer.backend.service.SoloAttemptRankingService;
import org.coderacer.backend.service.SoloAttemptService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableHandlerMethodArgumentResolver;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class SoloAttemptControllerTest {

  private final SoloAttemptService service = mock(SoloAttemptService.class);
  private final SoloAttemptHistoryService historyService = mock(SoloAttemptHistoryService.class);
  private final PersonalStatisticsService statisticsService = mock(PersonalStatisticsService.class);
  private final GlobalStatisticsService globalStatisticsService =
      mock(GlobalStatisticsService.class);
  private final SoloAttemptRankingService rankingService = mock(SoloAttemptRankingService.class);
  private final CurrentUserProvider currentUserProvider = mock(CurrentUserProvider.class);
  private final SoloAttemptMapper mapper = new SoloAttemptMapper();
  private MockMvc mockMvc;

  @BeforeEach
  void setUp() {
    mockMvc =
        MockMvcBuilders.standaloneSetup(
                new SoloAttemptController(
                    service,
                    historyService,
                    statisticsService,
                    globalStatisticsService,
                    rankingService,
                    currentUserProvider,
                    mapper))
            .setControllerAdvice(new GlobalExceptionHandler())
            .setCustomArgumentResolvers(new PageableHandlerMethodArgumentResolver())
            .build();
  }

  private User user(UUID id) {
    User user = new User();
    ReflectionTestUtils.setField(user, "id", id);
    return user;
  }

  private CodeSnippet snippet(UUID id) {
    Category category = new Category();
    category.setId(UUID.randomUUID());
    category.setName("Java");
    category.setActive(true);
    CodeSnippet snippet = new CodeSnippet("hello", "hello", "hash", Difficulty.EASY, category);
    ReflectionTestUtils.setField(snippet, "id", id);
    return snippet;
  }

  private SoloAttempt newAttempt(UUID attemptId, UUID userId, UUID snippetId, Instant startedAt) {
    SoloAttempt attempt =
        new SoloAttempt(user(userId), snippet(snippetId), Difficulty.EASY, startedAt);
    ReflectionTestUtils.setField(attempt, "id", attemptId);
    return attempt;
  }

  @Test
  void start_returns201WithScheduledStartedAt() throws Exception {
    UUID userId = UUID.randomUUID();
    UUID snippetId = UUID.randomUUID();
    UUID attemptId = UUID.randomUUID();
    Instant startedAt = Instant.parse("2026-01-01T00:00:03Z");
    when(currentUserProvider.resolve(any())).thenReturn(userId);
    when(service.start(eq(userId), eq(snippetId)))
        .thenReturn(newAttempt(attemptId, userId, snippetId, startedAt));

    mockMvc
        .perform(
            post("/api/solo-attempts")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"codeSnippetId\":\"" + snippetId + "\"}"))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.data.attemptId").value(attemptId.toString()))
        .andExpect(jsonPath("$.data.difficulty").value("EASY"));
  }

  @Test
  void start_returns400ForMissingCodeSnippetId() throws Exception {
    mockMvc
        .perform(post("/api/solo-attempts").contentType(MediaType.APPLICATION_JSON).content("{}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
  }

  @Test
  void submitProgress_returns403ForOwnershipMismatch() throws Exception {
    UUID attemptId = UUID.randomUUID();
    when(currentUserProvider.resolve(any())).thenReturn(UUID.randomUUID());
    when(service.submitProgress(eq(attemptId), any(), anyLong(), anyString()))
        .thenThrow(new SoloAttemptOwnershipException("Attempt does not belong to this user"));

    mockMvc
        .perform(
            post("/api/solo-attempts/" + attemptId + "/progress")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"sequence\":1,\"characters\":\"h\"}"))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("SOLO_ATTEMPT_NOT_OWNED"));
  }

  @Test
  void submitProgress_returns404ForMissingAttempt() throws Exception {
    UUID attemptId = UUID.randomUUID();
    when(currentUserProvider.resolve(any())).thenReturn(UUID.randomUUID());
    when(service.submitProgress(eq(attemptId), any(), anyLong(), anyString()))
        .thenThrow(new SoloAttemptNotFoundException(attemptId));

    mockMvc
        .perform(
            post("/api/solo-attempts/" + attemptId + "/progress")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"sequence\":1,\"characters\":\"h\"}"))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("SOLO_ATTEMPT_NOT_FOUND"));
  }

  @Test
  void submitProgress_returns409ForNotActiveAttempt() throws Exception {
    UUID attemptId = UUID.randomUUID();
    when(currentUserProvider.resolve(any())).thenReturn(UUID.randomUUID());
    when(service.submitProgress(eq(attemptId), any(), anyLong(), anyString()))
        .thenThrow(new SoloAttemptNotActiveException("Attempt is not active"));

    mockMvc
        .perform(
            post("/api/solo-attempts/" + attemptId + "/progress")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"sequence\":1,\"characters\":\"h\"}"))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("SOLO_ATTEMPT_NOT_ACTIVE"));
  }

  @Test
  void submitProgress_returns409ForOneActiveAttemptConflict() throws Exception {
    UUID userId = UUID.randomUUID();
    UUID snippetId = UUID.randomUUID();
    when(currentUserProvider.resolve(any())).thenReturn(userId);
    when(service.start(userId, snippetId))
        .thenThrow(new OneActiveAttemptConflictException("Already has an active attempt"));

    mockMvc
        .perform(
            post("/api/solo-attempts")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"codeSnippetId\":\"" + snippetId + "\"}"))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("ONE_ACTIVE_ATTEMPT_ALLOWED"));
  }

  @Test
  void submitProgress_returns400ForBlankCharacters() throws Exception {
    UUID attemptId = UUID.randomUUID();
    mockMvc
        .perform(
            post("/api/solo-attempts/" + attemptId + "/progress")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"sequence\":1,\"characters\":\"\"}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
  }

  @Test
  void submitProgress_returnsAckWhenStillInProgress() throws Exception {
    UUID userId = UUID.randomUUID();
    UUID snippetId = UUID.randomUUID();
    UUID attemptId = UUID.randomUUID();
    SoloAttempt attempt =
        newAttempt(attemptId, userId, snippetId, Instant.parse("2026-01-01T00:00:00Z"));
    attempt.activate();
    when(currentUserProvider.resolve(any())).thenReturn(userId);
    when(service.submitProgress(eq(attemptId), eq(userId), eq(1L), eq("he")))
        .thenReturn(new ProgressResult(attempt, 2));

    mockMvc
        .perform(
            post("/api/solo-attempts/" + attemptId + "/progress")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"sequence\":1,\"characters\":\"he\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.state").value("ACTIVE"))
        .andExpect(jsonPath("$.data.acceptedOffset").value(2));
  }

  @Test
  void submitProgress_returnsResultWhenCompleted() throws Exception {
    UUID userId = UUID.randomUUID();
    UUID snippetId = UUID.randomUUID();
    UUID attemptId = UUID.randomUUID();
    Instant startedAt = Instant.parse("2026-01-01T00:00:00Z");
    SoloAttempt attempt = newAttempt(attemptId, userId, snippetId, startedAt);
    attempt.activate();
    attempt.complete(startedAt.plusSeconds(45), 45_000, 400);
    when(currentUserProvider.resolve(any())).thenReturn(userId);
    when(service.submitProgress(eq(attemptId), eq(userId), eq(1L), eq("hello")))
        .thenReturn(new ProgressResult(attempt, 5));

    mockMvc
        .perform(
            post("/api/solo-attempts/" + attemptId + "/progress")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"sequence\":1,\"characters\":\"hello\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.state").value("COMPLETED"))
        .andExpect(jsonPath("$.data.cpm").value(400));
  }

  @Test
  void abandon_returns200() throws Exception {
    UUID userId = UUID.randomUUID();
    UUID snippetId = UUID.randomUUID();
    UUID attemptId = UUID.randomUUID();
    SoloAttempt attempt =
        newAttempt(attemptId, userId, snippetId, Instant.parse("2026-01-01T00:00:00Z"));
    attempt.abandon();
    when(currentUserProvider.resolve(any())).thenReturn(userId);
    when(service.abandon(attemptId, userId)).thenReturn(attempt);

    mockMvc
        .perform(post("/api/solo-attempts/" + attemptId + "/abandon"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.state").value("ABANDONED"));
  }

  @Test
  void history_returns200AndBindsFiltersAndPageable() throws Exception {
    UUID userId = UUID.randomUUID();
    UUID categoryId = UUID.randomUUID();
    UUID attemptId = UUID.randomUUID();
    SoloAttemptResultResponse result =
        new SoloAttemptResultResponse(
            attemptId,
            new SoloAttemptSnippetSummary(UUID.randomUUID(), "FizzBuzz", categoryId),
            Difficulty.EASY,
            SoloAttemptState.COMPLETED,
            45_000L,
            400,
            Instant.parse("2026-01-01T00:00:00Z"),
            Instant.parse("2026-01-01T00:00:45Z"));
    when(currentUserProvider.resolve(any())).thenReturn(userId);
    when(historyService.findHistory(
            eq(userId),
            eq(SoloAttemptState.COMPLETED),
            eq(categoryId),
            eq(Difficulty.EASY),
            eq(Instant.parse("2026-01-01T00:00:00Z")),
            eq(Instant.parse("2026-01-02T00:00:00Z")),
            any(Pageable.class)))
        .thenReturn(new PageImpl<>(List.of(result)));

    mockMvc
        .perform(
            get("/api/solo-attempts")
                .param("state", "COMPLETED")
                .param("categoryId", categoryId.toString())
                .param("difficulty", "EASY")
                .param("startedFrom", "2026-01-01T00:00:00Z")
                .param("startedTo", "2026-01-02T00:00:00Z")
                .param("page", "0")
                .param("size", "20"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.content[0].attemptId").value(attemptId.toString()))
        .andExpect(jsonPath("$.data.content[0].state").value("COMPLETED"))
        .andExpect(jsonPath("$.data.content[0].cpm").value(400))
        .andExpect(jsonPath("$.data.content[0].snippet.title").value("FizzBuzz"))
        .andExpect(jsonPath("$.data.page.totalElements").value(1));
  }

  @Test
  void history_returns200WithNoFilters() throws Exception {
    UUID userId = UUID.randomUUID();
    when(currentUserProvider.resolve(any())).thenReturn(userId);
    when(historyService.findHistory(
            eq(userId), eq(null), eq(null), eq(null), eq(null), eq(null), any(Pageable.class)))
        .thenReturn(new PageImpl<>(List.of()));

    mockMvc
        .perform(get("/api/solo-attempts"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.content").isEmpty());
  }

  @Test
  void history_returns400ForUnknownStateValue() throws Exception {
    when(currentUserProvider.resolve(any())).thenReturn(UUID.randomUUID());

    mockMvc
        .perform(get("/api/solo-attempts").param("state", "NOT_A_STATE"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
  }

  @Test
  void history_returns400ForNonTerminalStateFilter() throws Exception {
    UUID userId = UUID.randomUUID();
    when(currentUserProvider.resolve(any())).thenReturn(userId);
    when(historyService.findHistory(
            eq(userId),
            eq(SoloAttemptState.ACTIVE),
            eq(null),
            eq(null),
            eq(null),
            eq(null),
            any(Pageable.class)))
        .thenThrow(new ValidationException("Validation failed: state must be a finished attempt"));

    mockMvc
        .perform(get("/api/solo-attempts").param("state", "ACTIVE"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
  }

  @Test
  void getById_returns200WithResult() throws Exception {
    UUID userId = UUID.randomUUID();
    UUID snippetId = UUID.randomUUID();
    UUID attemptId = UUID.randomUUID();
    Instant startedAt = Instant.parse("2026-01-01T00:00:00Z");
    SoloAttempt attempt = newAttempt(attemptId, userId, snippetId, startedAt);
    attempt.activate();
    attempt.complete(startedAt.plusSeconds(45), 45_000, 400);
    when(currentUserProvider.resolve(any())).thenReturn(userId);
    when(service.getById(attemptId, userId)).thenReturn(attempt);

    mockMvc
        .perform(get("/api/solo-attempts/" + attemptId))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.state").value("COMPLETED"))
        .andExpect(jsonPath("$.data.cpm").value(400));
  }

  @Test
  void statistics_returns200WithMetricsForTheResolvedUser() throws Exception {
    UUID userId = UUID.randomUUID();
    when(currentUserProvider.resolve(any())).thenReturn(userId);
    when(statisticsService.forUser(userId))
        .thenReturn(
            new PersonalStatisticsResponse(
                List.of(
                    new DifficultyStatistics(Difficulty.EASY, 20_000L, 300, 30_000L, 250),
                    new DifficultyStatistics(Difficulty.MEDIUM, null, null, null, null),
                    new DifficultyStatistics(Difficulty.HARD, null, null, null, null))));

    mockMvc
        .perform(get("/api/solo-attempts/statistics"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.difficulties.length()").value(3))
        .andExpect(jsonPath("$.data.difficulties[0].difficulty").value("EASY"))
        .andExpect(jsonPath("$.data.difficulties[0].fastestDurationMs").value(20_000))
        .andExpect(jsonPath("$.data.difficulties[0].highestCpm").value(300))
        .andExpect(jsonPath("$.data.difficulties[0].averageDurationMs").value(30_000))
        .andExpect(jsonPath("$.data.difficulties[0].averageCpm").value(250))
        .andExpect(jsonPath("$.data.difficulties[1].averageCpm").doesNotExist());
  }

  @Test
  void globalStatistics_returns200WithRecordsForEachDifficulty() throws Exception {
    Instant recordedAt = Instant.parse("2026-01-01T00:00:45Z");
    when(globalStatisticsService.compute())
        .thenReturn(
            new GlobalStatisticsResponse(
                List.of(
                    new DifficultyGlobalStatistics(
                        Difficulty.EASY,
                        new FastestTimeRecord("alice", 20_000L, recordedAt),
                        new HighestCpmRecord("bob", 500, recordedAt)),
                    new DifficultyGlobalStatistics(Difficulty.MEDIUM, null, null),
                    new DifficultyGlobalStatistics(Difficulty.HARD, null, null))));

    mockMvc
        .perform(get("/api/solo-attempts/global-statistics"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.difficulties.length()").value(3))
        .andExpect(jsonPath("$.data.difficulties[0].difficulty").value("EASY"))
        .andExpect(jsonPath("$.data.difficulties[0].fastestTime.username").value("alice"))
        .andExpect(jsonPath("$.data.difficulties[0].fastestTime.durationMs").value(20_000))
        .andExpect(jsonPath("$.data.difficulties[0].highestCpm.username").value("bob"))
        .andExpect(jsonPath("$.data.difficulties[0].highestCpm.cpm").value(500))
        .andExpect(jsonPath("$.data.difficulties[1].fastestTime").doesNotExist())
        .andExpect(jsonPath("$.data.difficulties[1].highestCpm").doesNotExist());
  }

  @Test
  void globalStatistics_responseOmitsEmailAndAdminFields() throws Exception {
    Instant recordedAt = Instant.parse("2026-01-01T00:00:45Z");
    when(globalStatisticsService.compute())
        .thenReturn(
            new GlobalStatisticsResponse(
                List.of(
                    new DifficultyGlobalStatistics(
                        Difficulty.EASY,
                        new FastestTimeRecord("alice", 20_000L, recordedAt),
                        new HighestCpmRecord("alice", 300, recordedAt)),
                    new DifficultyGlobalStatistics(Difficulty.MEDIUM, null, null),
                    new DifficultyGlobalStatistics(Difficulty.HARD, null, null))));

    mockMvc
        .perform(get("/api/solo-attempts/global-statistics"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.difficulties[0].fastestTime.email").doesNotExist())
        .andExpect(jsonPath("$.data.difficulties[0].fastestTime.enabled").doesNotExist())
        .andExpect(jsonPath("$.data.difficulties[0].fastestTime.role").doesNotExist())
        .andExpect(jsonPath("$.data.difficulties[0].highestCpm.email").doesNotExist())
        .andExpect(jsonPath("$.data.difficulties[0].highestCpm.enabled").doesNotExist())
        .andExpect(jsonPath("$.data.difficulties[0].highestCpm.role").doesNotExist());
  }

  @Test
  void rankingReturnsTheLeaderboardContextForAnAttempt() throws Exception {
    UUID attemptId = UUID.randomUUID();
    UUID userId = UUID.randomUUID();
    when(currentUserProvider.resolve(any())).thenReturn(userId);
    when(rankingService.forAttempt(attemptId, userId))
        .thenReturn(new SoloAttemptRankingResponse(attemptId, true, 47_000L, 431, 171, 171, 301));

    mockMvc
        .perform(get("/api/solo-attempts/" + attemptId + "/ranking"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.newPersonalBest").value(true))
        .andExpect(jsonPath("$.data.previousBestDurationMs").value(47000))
        .andExpect(jsonPath("$.data.previousBestCpm").value(431))
        .andExpect(jsonPath("$.data.attemptRank").value(171))
        .andExpect(jsonPath("$.data.globalRank").value(171))
        .andExpect(jsonPath("$.data.previousGlobalRank").value(301));
  }

  @Test
  void rankingReturns404ForAnAttemptThatDoesNotExist() throws Exception {
    UUID attemptId = UUID.randomUUID();
    UUID userId = UUID.randomUUID();
    when(currentUserProvider.resolve(any())).thenReturn(userId);
    when(rankingService.forAttempt(attemptId, userId))
        .thenThrow(new SoloAttemptNotFoundException(attemptId));

    mockMvc
        .perform(get("/api/solo-attempts/" + attemptId + "/ranking"))
        .andExpect(status().isNotFound());
  }
}
