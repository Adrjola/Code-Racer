package org.coderacer.backend.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.coderacer.backend.dto.AdminUserResponse;
import org.coderacer.backend.enums.UserRole;
import org.coderacer.backend.exception.ConflictException;
import org.coderacer.backend.exception.GlobalExceptionHandler;
import org.coderacer.backend.exception.SelfActionForbiddenException;
import org.coderacer.backend.exception.ValidationException;
import org.coderacer.backend.security.CurrentJwtUserProvider;
import org.coderacer.backend.service.AdminUserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.web.PageableHandlerMethodArgumentResolver;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class AdminUserControllerTest {

  private final AdminUserService service = mock(AdminUserService.class);
  private final CurrentJwtUserProvider currentJwtUserProvider = mock(CurrentJwtUserProvider.class);
  private final UUID id = UUID.randomUUID();
  private final UUID adminId = UUID.randomUUID();
  private final AdminUserResponse response =
      new AdminUserResponse(
          id,
          "player",
          "player@example.com",
          UserRole.USER,
          true,
          false,
          Instant.now(),
          Instant.now());
  private MockMvc mockMvc;

  @BeforeEach
  void setUp() {
    when(currentJwtUserProvider.resolve()).thenReturn(adminId);
    mockMvc =
        MockMvcBuilders.standaloneSetup(new AdminUserController(service, currentJwtUserProvider))
            .setControllerAdvice(new GlobalExceptionHandler())
            .setCustomArgumentResolvers(new PageableHandlerMethodArgumentResolver())
            .build();
  }

  @Test
  void list_returns200() throws Exception {
    when(service.list(any(), any(), any(), any())).thenReturn(new PageImpl<>(List.of(response)));

    mockMvc
        .perform(get("/api/admin/users"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.content[0].username").value("player"));
  }

  @Test
  void list_returns400_whenBooleanParamIsInvalid() throws Exception {
    mockMvc
        .perform(get("/api/admin/users").param("deleted", "not-a-boolean"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
  }

  @Test
  void get_returns200() throws Exception {
    when(service.getById(id)).thenReturn(response);

    mockMvc
        .perform(get("/api/admin/users/" + id))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.email").value("player@example.com"));
  }

  @Test
  void delete_returns204_andUsesCurrentAdminId() throws Exception {
    mockMvc.perform(delete("/api/admin/users/" + id)).andExpect(status().isNoContent());

    verify(service).delete(id, adminId);
  }

  @Test
  void delete_returns403_whenSelfProtectionTriggered() throws Exception {
    doThrow(new SelfActionForbiddenException("Admins cannot delete their own account"))
        .when(service)
        .delete(id, adminId);

    mockMvc
        .perform(delete("/api/admin/users/" + id))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("SELF_ACTION_FORBIDDEN"));
  }

  @Test
  void restore_returns200() throws Exception {
    when(service.restore(id)).thenReturn(response);

    mockMvc.perform(post("/api/admin/users/" + id + "/restore")).andExpect(status().isOk());
  }

  @Test
  void update_returns200() throws Exception {
    when(service.update(any(), any())).thenReturn(response);

    mockMvc
        .perform(
            put("/api/admin/users/" + id)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"newname\",\"email\":\"new@example.com\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.username").value("player"));
  }

  @Test
  void update_returns400_whenValidationFails() throws Exception {
    doThrow(new ValidationException("Validation failed: email must not be blank"))
        .when(service)
        .update(any(), any());

    mockMvc
        .perform(
            put("/api/admin/users/" + id)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"newname\",\"email\":\"\"}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
  }

  @Test
  void update_returns409_whenConflicting() throws Exception {
    doThrow(
            new ConflictException(
                "A user with this email or username already exists", "USER_ALREADY_EXISTS"))
        .when(service)
        .update(any(), any());

    mockMvc
        .perform(
            put("/api/admin/users/" + id)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"taken\",\"email\":\"new@example.com\"}"))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("USER_ALREADY_EXISTS"));
  }
}
