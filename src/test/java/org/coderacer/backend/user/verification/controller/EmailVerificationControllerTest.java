package org.coderacer.backend.user.verification.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.UUID;
import org.coderacer.backend.common.error.ProblemDetailsFactory;
import org.coderacer.backend.common.exception.GlobalExceptionHandler;
import org.coderacer.backend.user.dto.UserResponse;
import org.coderacer.backend.user.model.UserRole;
import org.coderacer.backend.user.verification.dto.EmailVerificationResendResponse;
import org.coderacer.backend.user.verification.exception.EmailVerificationFailedException;
import org.coderacer.backend.user.verification.service.EmailVerificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class EmailVerificationControllerTest {

  private final EmailVerificationService service = mock(EmailVerificationService.class);
  private MockMvc mockMvc;

  @BeforeEach
  void setUp() {
    mockMvc =
        MockMvcBuilders.standaloneSetup(new EmailVerificationController(service))
            .setControllerAdvice(new GlobalExceptionHandler(new ProblemDetailsFactory()))
            .build();
  }

  @Test
  void confirm_returnsVerifiedUserResponse() throws Exception {
    UUID id = UUID.randomUUID();
    when(service.confirm(any()))
        .thenReturn(
            new UserResponse(
                id,
                "player@example.com",
                "speed_racer",
                UserRole.USER,
                true,
                true,
                Instant.now(),
                Instant.now()));

    mockMvc
        .perform(
            post("/api/auth/email-verification/confirm")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"token\": \"verification-token\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.id").value(id.toString()))
        .andExpect(jsonPath("$.data.emailVerified").value(true))
        .andExpect(jsonPath("$.data.password").doesNotExist())
        .andExpect(jsonPath("$.data.passwordHash").doesNotExist());
  }

  @Test
  void confirm_returns400ForInvalidOrExpiredToken() throws Exception {
    when(service.confirm(any())).thenThrow(new EmailVerificationFailedException());

    mockMvc
        .perform(
            post("/api/auth/email-verification/confirm")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"token\": \"invalid-token\"}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("EMAIL_VERIFICATION_FAILED"));
  }

  @Test
  void confirm_returns400ForBlankToken() throws Exception {
    mockMvc
        .perform(
            post("/api/auth/email-verification/confirm")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"token\": \"\"}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
  }

  @Test
  void resend_returnsNeutralAcceptedResponse() throws Exception {
    when(service.resend(any())).thenReturn(EmailVerificationResendResponse.accepted());

    mockMvc
        .perform(
            post("/api/auth/email-verification/resend")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\": \"player@example.com\"}"))
        .andExpect(status().isAccepted())
        .andExpect(
            jsonPath("$.data.message")
                .value("If an unverified account exists, a verification email will be sent."));
  }
}
