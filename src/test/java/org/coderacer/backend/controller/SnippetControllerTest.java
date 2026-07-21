package org.coderacer.backend.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.coderacer.backend.dto.SnippetResponse;
import org.coderacer.backend.enums.Difficulty;
import org.coderacer.backend.enums.SnippetLifecycle;
import org.coderacer.backend.exception.GlobalExceptionHandler;
import org.coderacer.backend.service.SnippetService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.web.PageableHandlerMethodArgumentResolver;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class SnippetControllerTest {

  private final SnippetService service = mock(SnippetService.class);
  private final UUID id = UUID.randomUUID();
  private final UUID categoryId = UUID.randomUUID();
  private final SnippetResponse response =
      new SnippetResponse(
          UUID.randomUUID(),
          "FizzBuzz",
          "code",
          Difficulty.EASY,
          SnippetLifecycle.ACTIVE,
          UUID.randomUUID(),
          Instant.now(),
          Instant.now());
  private MockMvc mockMvc;

  @BeforeEach
  void setUp() {
    mockMvc =
        MockMvcBuilders.standaloneSetup(
                new AdminSnippetController(service), new SnippetController(service))
            .setControllerAdvice(new GlobalExceptionHandler())
            .setCustomArgumentResolvers(new PageableHandlerMethodArgumentResolver())
            .build();
  }

  @Test
  void create_returns201() throws Exception {
    when(service.create(any())).thenReturn(response);

    mockMvc
        .perform(
            post("/api/admin/snippets")
                .contentType(MediaType.APPLICATION_JSON)
                .content(createBody()))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.data.title").value("FizzBuzz"))
        .andExpect(jsonPath("$.data.lifecycle").value("ACTIVE"));
  }

  @Test
  void create_returns400_whenTitleIsBlank() throws Exception {
    mockMvc
        .perform(
            post("/api/admin/snippets")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"title\":\"\",\"source\":\"code\",\"difficulty\":\"EASY\",\"categoryId\":\""
                        + categoryId
                        + "\"}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
  }

  @Test
  void create_returns400_whenDifficultyIsMissing() throws Exception {
    mockMvc
        .perform(
            post("/api/admin/snippets")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"title\":\"FizzBuzz\",\"source\":\"code\",\"categoryId\":\""
                        + categoryId
                        + "\"}"))
        .andExpect(status().isBadRequest());
  }

  @Test
  void get_returns200() throws Exception {
    when(service.getById(id)).thenReturn(response);

    mockMvc.perform(get("/api/admin/snippets/" + id)).andExpect(status().isOk());
  }

  @Test
  void list_returns200_andPassesFilters() throws Exception {
    when(service.list(eq(categoryId), eq(Difficulty.HARD), eq(SnippetLifecycle.ACTIVE), any()))
        .thenReturn(new PageImpl<>(List.of(response)));

    mockMvc
        .perform(
            get("/api/admin/snippets")
                .param("categoryId", categoryId.toString())
                .param("difficulty", "HARD")
                .param("lifecycle", "ACTIVE"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.content[0].title").value("FizzBuzz"));
  }

  @Test
  void delete_returns204() throws Exception {
    mockMvc.perform(delete("/api/admin/snippets/" + id)).andExpect(status().isNoContent());

    verify(service).delete(id);
  }

  @Test
  void random_returns200_andPassesExclusion() throws Exception {
    when(service.randomEligible(eq(categoryId), eq(Difficulty.EASY), eq(id))).thenReturn(response);

    mockMvc
        .perform(
            get("/api/snippets/random")
                .param("categoryId", categoryId.toString())
                .param("difficulty", "EASY")
                .param("excludeId", id.toString()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.source").value("code"));
  }

  private String createBody() {
    return "{\"title\":\"FizzBuzz\",\"source\":\"code\",\"difficulty\":\"EASY\",\"categoryId\":\""
        + categoryId
        + "\"}";
  }
}
