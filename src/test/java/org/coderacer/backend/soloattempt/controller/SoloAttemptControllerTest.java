package org.coderacer.backend.soloattempt.controller;

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
import java.util.UUID;
import org.coderacer.backend.category.model.Category;
import org.coderacer.backend.common.error.ProblemDetailsFactory;
import org.coderacer.backend.common.exception.GlobalExceptionHandler;
import org.coderacer.backend.snippet.model.CodeSnippet;
import org.coderacer.backend.snippet.model.Difficulty;
import org.coderacer.backend.soloattempt.exception.OneActiveAttemptConflictException;
import org.coderacer.backend.soloattempt.exception.SoloAttemptNotActiveException;
import org.coderacer.backend.soloattempt.exception.SoloAttemptNotFoundException;
import org.coderacer.backend.soloattempt.exception.SoloAttemptOwnershipException;
import org.coderacer.backend.soloattempt.identity.CurrentUserProvider;
import org.coderacer.backend.soloattempt.mapper.SoloAttemptMapper;
import org.coderacer.backend.soloattempt.model.SoloAttempt;
import org.coderacer.backend.soloattempt.service.ProgressResult;
import org.coderacer.backend.soloattempt.service.SoloAttemptService;
import org.coderacer.backend.user.model.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class SoloAttemptControllerTest {

  private final SoloAttemptService service = mock(SoloAttemptService.class);
  private final CurrentUserProvider currentUserProvider = mock(CurrentUserProvider.class);
  private final SoloAttemptMapper mapper = new SoloAttemptMapper();
  private MockMvc mockMvc;

  @BeforeEach
  void setUp() {
    mockMvc =
        MockMvcBuilders.standaloneSetup(
                new SoloAttemptController(service, currentUserProvider, mapper))
            .setControllerAdvice(new GlobalExceptionHandler(new ProblemDetailsFactory()))
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
    CodeSnippet snippet =
        CodeSnippet.firstRevision("hello", "hello", "hash", Difficulty.EASY, category);
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
}
