package org.coderacer.backend.controller;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.UUID;
import org.coderacer.backend.dto.ExplanationResponse;
import org.coderacer.backend.exception.AiProviderException;
import org.coderacer.backend.exception.GlobalExceptionHandler;
import org.coderacer.backend.exception.ResourceNotFoundException;
import org.coderacer.backend.service.ExplanationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class AdminExplanationControllerTest {

  private final ExplanationService service = mock(ExplanationService.class);
  private final UUID snippetId = UUID.randomUUID();
  private MockMvc mockMvc;

  @BeforeEach
  void setUp() {
    mockMvc =
        MockMvcBuilders.standaloneSetup(new AdminExplanationController(service))
            .setControllerAdvice(new GlobalExceptionHandler())
            .build();
  }

  @Test
  void generate_returns200_withValidResponse() throws Exception {
    ExplanationResponse response =
        new ExplanationResponse(
            "A summary", List.of("Step 1"), List.of("Concept 1"), List.of("Practice 1"));
    when(service.generateAndSave(snippetId)).thenReturn(response);

    mockMvc
        .perform(post("/api/admin/snippets/{id}/explanation", snippetId))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.summary").value("A summary"))
        .andExpect(jsonPath("$.data.stepByStep[0]").value("Step 1"))
        .andExpect(jsonPath("$.data.concepts[0]").value("Concept 1"))
        .andExpect(jsonPath("$.data.bestPractices[0]").value("Practice 1"));
  }

  @Test
  void generate_returns404_whenSnippetNotFound() throws Exception {
    when(service.generateAndSave(snippetId))
        .thenThrow(new ResourceNotFoundException("Snippet not found: " + snippetId));

    mockMvc
        .perform(post("/api/admin/snippets/{id}/explanation", snippetId))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("RESOURCE_NOT_FOUND"));
  }

  @Test
  void generate_returns503_whenProviderDisabled() throws Exception {
    when(service.generateAndSave(snippetId)).thenThrow(AiProviderException.disabled());

    mockMvc
        .perform(post("/api/admin/snippets/{id}/explanation", snippetId))
        .andExpect(status().isServiceUnavailable())
        .andExpect(jsonPath("$.code").value("AI_PROVIDER_DISABLED"));
  }

  @Test
  void generate_returns504_whenProviderTimesOut() throws Exception {
    when(service.generateAndSave(snippetId))
        .thenThrow(AiProviderException.timeout(new RuntimeException("timeout")));

    mockMvc
        .perform(post("/api/admin/snippets/{id}/explanation", snippetId))
        .andExpect(status().isGatewayTimeout())
        .andExpect(jsonPath("$.code").value("AI_PROVIDER_TIMEOUT"));
  }

  @Test
  void generate_returns502_whenProviderReturnsInvalidResponse() throws Exception {
    when(service.generateAndSave(snippetId))
        .thenThrow(AiProviderException.invalidResponse("malformed"));

    mockMvc
        .perform(post("/api/admin/snippets/{id}/explanation", snippetId))
        .andExpect(status().isBadGateway())
        .andExpect(jsonPath("$.code").value("AI_PROVIDER_INVALID_RESPONSE"));
  }

  @Test
  void generate_returns400_whenIdIsNotUuid() throws Exception {
    mockMvc
        .perform(post("/api/admin/snippets/{id}/explanation", "not-a-uuid"))
        .andExpect(status().isBadRequest());
  }
}
