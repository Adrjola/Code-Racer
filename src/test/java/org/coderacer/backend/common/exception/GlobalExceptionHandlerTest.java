package org.coderacer.backend.common.exception;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@WebMvcTest
@Import(GlobalExceptionHandler.class)
class GlobalExceptionHandlerTest {

  @Autowired private MockMvc mockMvc;

  @Test
  void shouldHandleResourceNotFoundException() throws Exception {
    mockMvc
        .perform(get("/api/test/not-found"))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.status").value(404))
        .andExpect(jsonPath("$.code").value("RESOURCE_NOT_FOUND"))
        .andExpect(jsonPath("$.detail").value("Resource not found"));
  }

  @Test
  void shouldHandleConflictException() throws Exception {
    mockMvc
        .perform(get("/api/test/conflict"))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.status").value(409))
        .andExpect(jsonPath("$.code").value("ALREADY_EXISTS"))
        .andExpect(jsonPath("$.detail").value("Conflict occurred"));
  }

  @Test
  void shouldHandleValidationException() throws Exception {
    mockMvc
        .perform(
            post("/api/test/validation")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"\"}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.status").value(400))
        .andExpect(jsonPath("$.code").value("INVALID_INPUT"))
        .andExpect(jsonPath("$.errors[0].field").value("name"))
        .andExpect(jsonPath("$.errors[0].rejectedValue").doesNotExist());
  }

  @Test
  void shouldHandleFrameworkException() throws Exception {
    mockMvc
        .perform(get("/api/test/validation")) // GET on a POST endpoint
        .andExpect(status().isMethodNotAllowed())
        .andExpect(jsonPath("$.status").value(405))
        .andExpect(jsonPath("$.code").value("FRAMEWORK_ERROR"));
  }

  @Test
  void shouldHandleGeneralException() throws Exception {
    mockMvc
        .perform(get("/api/test/error"))
        .andExpect(status().isInternalServerError())
        .andExpect(jsonPath("$.status").value(500))
        .andExpect(jsonPath("$.code").value("INTERNAL_SERVER_ERROR"));
  }

  @RestController
  static class TestController {
    @GetMapping("/api/test/not-found")
    public void notFound() {
      throw new ResourceNotFoundException("Resource not found");
    }

    @GetMapping("/api/test/conflict")
    public void conflict() {
      throw new ConflictException("Conflict occurred", "ALREADY_EXISTS");
    }

    @PostMapping("/api/test/validation")
    public void validation(@Valid @RequestBody TestRequest request) {}

    @GetMapping("/api/test/error")
    public void error() {
      throw new RuntimeException("Unexpected error");
    }
  }

  @org.springframework.context.annotation.Configuration
  static class TestConfig {
    @org.springframework.context.annotation.Bean
    public TestController testController() {
      return new TestController();
    }
  }

  record TestRequest(@NotBlank String name) {}
}
