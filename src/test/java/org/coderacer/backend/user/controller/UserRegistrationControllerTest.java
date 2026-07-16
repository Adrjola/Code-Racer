package org.coderacer.backend.user.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.UUID;
import org.coderacer.backend.common.exception.ConflictException;
import org.coderacer.backend.common.exception.GlobalExceptionHandler;
import org.coderacer.backend.common.exception.ValidationException;
import org.coderacer.backend.user.dto.UserResponse;
import org.coderacer.backend.user.model.UserRole;
import org.coderacer.backend.user.service.UserRegistrationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class UserRegistrationControllerTest {

  private final UserRegistrationService service = mock(UserRegistrationService.class);
  private MockMvc mockMvc;

  @BeforeEach
  void setUp() {
    mockMvc =
        MockMvcBuilders.standaloneSetup(new UserRegistrationController(service))
            .setControllerAdvice(new GlobalExceptionHandler())
            .build();
  }

  @Test
  void register_returns201WithSafeUserResponse() throws Exception {
    UUID id = UUID.randomUUID();
    when(service.register(any()))
        .thenReturn(
            new UserResponse(
                id,
                "player@example.com",
                "speed_racer",
                UserRole.USER,
                false,
                true,
                Instant.now(),
                Instant.now()));

    mockMvc
        .perform(
            post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {
                      "email": "player@example.com",
                      "username": "speed_racer",
                      "password": "StrongerPass123",
                      "confirmPassword": "StrongerPass123"
                    }
                    """))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.data.id").value(id.toString()))
        .andExpect(jsonPath("$.data.email").value("player@example.com"))
        .andExpect(jsonPath("$.data.role").value("USER"))
        .andExpect(jsonPath("$.data.password").doesNotExist())
        .andExpect(jsonPath("$.data.passwordHash").doesNotExist())
        .andExpect(jsonPath("$.data.confirmPassword").doesNotExist());
  }

  @Test
  void register_returns400ForBeanValidationFailure() throws Exception {
    mockMvc
        .perform(
            post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {
                      "email": "",
                      "username": "speed_racer",
                      "password": "StrongerPass123",
                      "confirmPassword": "StrongerPass123"
                    }
                    """))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
  }

  @Test
  void register_returns400ForServiceValidationFailure() throws Exception {
    when(service.register(any()))
        .thenThrow(
            new ValidationException(
                "Registration validation failed: confirmPassword must match password"));

    mockMvc
        .perform(
            post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {
                      "email": "player@example.com",
                      "username": "speed_racer",
                      "password": "StrongerPass123",
                      "confirmPassword": "DifferentPass123"
                    }
                    """))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
        .andExpect(
            jsonPath("$.message")
                .value("Registration validation failed: confirmPassword must match password"))
        .andExpect(jsonPath("$.errors").doesNotExist());
  }

  @Test
  void register_returns409ForDuplicateIdentifiers() throws Exception {
    when(service.register(any()))
        .thenThrow(
            new ConflictException(
                "A user with this email or username already exists", "USER_ALREADY_EXISTS"));

    mockMvc
        .perform(
            post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {
                      "email": "player@example.com",
                      "username": "speed_racer",
                      "password": "StrongerPass123",
                      "confirmPassword": "StrongerPass123"
                    }
                    """))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("USER_ALREADY_EXISTS"));
  }
}
