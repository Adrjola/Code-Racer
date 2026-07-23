package org.coderacer.backend.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.coderacer.backend.dto.ForgotPasswordResponse;
import org.coderacer.backend.exception.GlobalExceptionHandler;
import org.coderacer.backend.exception.PasswordResetFailedException;
import org.coderacer.backend.service.PasswordResetService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class PasswordResetControllerTest {

  private final PasswordResetService service = mock(PasswordResetService.class);
  private MockMvc mockMvc;

  @BeforeEach
  void setUp() {
    mockMvc =
        MockMvcBuilders.standaloneSetup(new PasswordResetController(service))
            .setControllerAdvice(new GlobalExceptionHandler())
            .build();
  }

  @Test
  void forgotPassword_returnsNeutralAcceptedResponse() throws Exception {
    when(service.requestReset(any())).thenReturn(ForgotPasswordResponse.accepted());

    mockMvc
        .perform(
            post("/api/auth/forgot-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\": \"player@example.com\"}"))
        .andExpect(status().isAccepted())
        .andExpect(
            jsonPath("$.data.message")
                .value(
                    "If an account with the provided email exists, "
                        + "a password reset email will be sent."))
        .andExpect(jsonPath("$.timestamp").exists());
  }

  @Test
  void forgotPassword_returns400ForInvalidEmail() throws Exception {
    mockMvc
        .perform(
            post("/api/auth/forgot-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\": \"not-an-email\"}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
  }

  @Test
  void resetPassword_returns204ForValidReset() throws Exception {
    mockMvc
        .perform(
            post("/api/auth/reset-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {
                      "token": "reset-token",
                      "newPassword": "NewPassword123",
                      "confirmPassword": "NewPassword123"
                    }
                    """))
        .andExpect(status().isNoContent());

    verify(service).resetPassword(any());
  }

  @Test
  void resetPassword_returns400ForInvalidOrExpiredToken() throws Exception {
    doThrow(new PasswordResetFailedException()).when(service).resetPassword(any());

    mockMvc
        .perform(
            post("/api/auth/reset-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {
                      "token": "invalid-token",
                      "newPassword": "NewPassword123",
                      "confirmPassword": "NewPassword123"
                    }
                    """))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("PASSWORD_RESET_FAILED"));
  }
}
