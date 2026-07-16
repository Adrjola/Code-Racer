package org.coderacer.backend.auth.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.UUID;
import org.coderacer.backend.auth.dto.LoginResponse;
import org.coderacer.backend.auth.exception.AuthenticationFailedException;
import org.coderacer.backend.auth.exception.TooManyLoginAttemptsException;
import org.coderacer.backend.auth.service.AuthenticationService;
import org.coderacer.backend.auth.service.LoginAttemptService;
import org.coderacer.backend.common.exception.GlobalExceptionHandler;
import org.coderacer.backend.user.dto.UserResponse;
import org.coderacer.backend.user.model.UserRole;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class AuthenticationControllerTest {

  private final AuthenticationService service = mock(AuthenticationService.class);
  private final LoginAttemptService loginAttemptService = mock(LoginAttemptService.class);
  private MockMvc mockMvc;

  @BeforeEach
  void setUp() {
    mockMvc =
        MockMvcBuilders.standaloneSetup(new AuthenticationController(service, loginAttemptService))
            .setControllerAdvice(new GlobalExceptionHandler())
            .build();
  }

  @Test
  void login_returnsBearerToken() throws Exception {
    when(service.login(any()))
        .thenReturn(
            new LoginResponse(
                "jwt-token",
                "Bearer",
                900,
                new UserResponse(
                    UUID.randomUUID(),
                    "player@example.com",
                    "player",
                    UserRole.USER,
                    true,
                    true,
                    Instant.now(),
                    Instant.now())));

    mockMvc
        .perform(
            post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {
                      "username": "player",
                      "password": "StrongerPass123"
                    }
                    """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.accessToken").value("jwt-token"))
        .andExpect(jsonPath("$.data.tokenType").value("Bearer"))
        .andExpect(jsonPath("$.data.expiresInSeconds").value(900))
        .andExpect(jsonPath("$.data.user.username").value("player"))
        .andExpect(jsonPath("$.data.password").doesNotExist())
        .andExpect(jsonPath("$.data.passwordHash").doesNotExist());
    verify(loginAttemptService).recordSuccess(eq("player"), any());
  }

  @Test
  void login_returns401ForInvalidCredentials() throws Exception {
    when(service.login(any())).thenThrow(new AuthenticationFailedException());

    mockMvc
        .perform(
            post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {
                      "username": "player",
                      "password": "WrongPass123"
                    }
                    """))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
    verify(loginAttemptService).recordFailure(eq("player"), any());
  }

  @Test
  void login_returns429WhenAttemptLimitIsExceeded() throws Exception {
    doThrow(new TooManyLoginAttemptsException())
        .when(loginAttemptService)
        .assertAllowed(eq("player"), any());

    mockMvc
        .perform(
            post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {
                      "username": "player",
                      "password": "WrongPass123"
                    }
                    """))
        .andExpect(status().isTooManyRequests())
        .andExpect(jsonPath("$.code").value("TOO_MANY_LOGIN_ATTEMPTS"));
  }

  @Test
  void login_returns400ForBlankUsername() throws Exception {
    mockMvc
        .perform(
            post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {
                      "username": "",
                      "password": "StrongerPass123"
                    }
                    """))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
  }
}
