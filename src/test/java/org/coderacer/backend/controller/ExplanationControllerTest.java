package org.coderacer.backend.controller;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.UUID;
import org.coderacer.backend.dto.ExplanationResponse;
import org.coderacer.backend.exception.GlobalExceptionHandler;
import org.coderacer.backend.exception.ResourceNotFoundException;
import org.coderacer.backend.service.ExplanationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class ExplanationControllerTest {

  private final ExplanationService service = mock(ExplanationService.class);
  private final UUID snippetId = UUID.randomUUID();
  private MockMvc mockMvc;

  @BeforeEach
  void setUp() {
    mockMvc =
        MockMvcBuilders.standaloneSetup(new ExplanationController(service))
            .setControllerAdvice(new GlobalExceptionHandler())
            .build();
  }

  @Test
  void getExplanation_returns200_withValidResponse() throws Exception {
    ExplanationResponse response =
        new ExplanationResponse(
            "A summary", List.of("Step 1"), List.of("Concept 1"), List.of("Practice 1"));
    when(service.getExplanation(snippetId)).thenReturn(response);

    mockMvc
        .perform(get("/api/snippets/{id}/explanation", snippetId))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.summary").value("A summary"))
        .andExpect(jsonPath("$.data.stepByStep[0]").value("Step 1"))
        .andExpect(jsonPath("$.data.concepts[0]").value("Concept 1"))
        .andExpect(jsonPath("$.data.bestPractices[0]").value("Practice 1"));
  }

  @Test
  void getExplanation_returns404_whenNoExplanation() throws Exception {
    when(service.getExplanation(snippetId))
        .thenThrow(
            new ResourceNotFoundException("No explanation available for snippet: " + snippetId));

    mockMvc
        .perform(get("/api/snippets/{id}/explanation", snippetId))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("RESOURCE_NOT_FOUND"));
  }

  @Test
  void getExplanation_returns400_whenIdIsNotUuid() throws Exception {
    mockMvc
        .perform(get("/api/snippets/{id}/explanation", "not-a-uuid"))
        .andExpect(status().isBadRequest());
  }
}
