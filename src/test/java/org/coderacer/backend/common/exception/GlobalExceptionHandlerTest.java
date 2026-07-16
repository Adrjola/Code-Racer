package org.coderacer.backend.common.exception;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.util.List;
import java.util.UUID;
import org.coderacer.backend.common.error.FieldError;
import org.coderacer.backend.common.error.ProblemDetailsFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.data.core.PropertyReferenceException;
import org.springframework.data.core.TypeInformation;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.validation.BindException;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

class GlobalExceptionHandlerTest {

  private MockMvc mockMvc;

  @BeforeEach
  void setUp() {
    mockMvc =
        MockMvcBuilders.standaloneSetup(new TestController())
            .setControllerAdvice(new GlobalExceptionHandler(new ProblemDetailsFactory()))
            .build();
  }

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
  void shouldHandleOptimisticLockingFailureAsConflict() throws Exception {
    mockMvc
        .perform(get("/api/test/optimistic-lock"))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.status").value(409))
        .andExpect(jsonPath("$.code").value("VERSION_CONFLICT"));
  }

  @Test
  void shouldHandleMethodArgumentNotValidException() throws Exception {
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

  @Test
  void shouldHandleServiceValidationException() throws Exception {
    mockMvc
        .perform(get("/api/test/manual-validation"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.status").value(400))
        .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
        .andExpect(jsonPath("$.errors[0].field").value("testField"));
  }

  @Test
  void shouldHandleResponseStatusException() throws Exception {
    mockMvc
        .perform(get("/api/test/response-status"))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.status").value(404))
        .andExpect(jsonPath("$.code").value("FRAMEWORK_ERROR"));
  }

  @Test
  void shouldGenerateCorrelationIdWhenMdcIsEmpty() throws Exception {
    MDC.clear();
    mockMvc
        .perform(get("/api/test/error"))
        .andExpect(status().isInternalServerError())
        .andExpect(jsonPath("$.correlationId").isNotEmpty());
  }

  @Test
  void shouldReuseCorrelationIdFromMdcIfPresent() throws Exception {
    String existingId = "mdc-correlation-id";
    MDC.put("correlationId", existingId);
    try {
      mockMvc
          .perform(get("/api/test/error"))
          .andExpect(status().isInternalServerError())
          .andExpect(jsonPath("$.correlationId").value(existingId));
    } finally {
      MDC.clear();
    }
  }

  @Test
  void shouldHandleBindException() throws Exception {
    TestRequest target = new TestRequest("");
    BindException ex = new BindException(target, "testRequest");
    ex.rejectValue("name", "required", "must not be blank");

    mockMvc
        .perform(get("/api/test/bind-exception").requestAttr("ex", ex))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("INVALID_INPUT"))
        .andExpect(jsonPath("$.errors[0].field").value("name"));
  }

  @Test
  void shouldHandleTypeMismatchAsBadRequest() throws Exception {
    mockMvc
        .perform(get("/api/test/typed").param("id", "not-a-uuid"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.status").value(400))
        .andExpect(jsonPath("$.code").value("INVALID_INPUT"))
        .andExpect(jsonPath("$.errors[0].field").value("id"));
  }

  @Test
  void shouldHandleUnknownSortPropertyAsBadRequest() throws Exception {
    mockMvc
        .perform(get("/api/test/unknown-property"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.status").value(400))
        .andExpect(jsonPath("$.code").value("INVALID_INPUT"))
        .andExpect(jsonPath("$.errors[0].field").value("bogusProperty"));
  }

  @RestController
  static class TestController {
    private static final Logger log = LoggerFactory.getLogger(TestController.class);

    @GetMapping("/api/test/typed")
    public void typed(@RequestParam UUID id) {}

    @GetMapping("/api/test/unknown-property")
    public void unknownProperty() {
      throw new PropertyReferenceException(
          "bogusProperty", TypeInformation.of(TestRequest.class), List.of());
    }

    @GetMapping("/api/test/not-found")
    public void notFound() {
      throw new ResourceNotFoundException("Resource not found");
    }

    @GetMapping("/api/test/conflict")
    public void conflict() {
      throw new ConflictException("Conflict occurred", "ALREADY_EXISTS");
    }

    @GetMapping("/api/test/optimistic-lock")
    public void optimisticLock() {
      throw new OptimisticLockingFailureException("stale revision");
    }

    @PostMapping("/api/test/validation")
    public void validation(@Valid @RequestBody TestRequest request) {
      // Method body left empty as it's only used to trigger validation via @Valid
      log.debug("Received validation request for: {}", request);
    }

    @GetMapping("/api/test/manual-validation")
    public void manualValidation() {
      throw new ValidationException(
          "Validation failed", List.of(new FieldError("testField", "must not be null")));
    }

    @GetMapping("/api/test/response-status")
    public void responseStatus() {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Not found reason");
    }

    @GetMapping("/api/test/error")
    public void error() {
      throw new RuntimeException("Unexpected error");
    }

    @GetMapping("/api/test/bind-exception")
    public void bindException(HttpServletRequest request) throws Throwable {
      throw (Throwable) request.getAttribute("ex");
    }
  }

  record TestRequest(@NotBlank String name) {}
}
