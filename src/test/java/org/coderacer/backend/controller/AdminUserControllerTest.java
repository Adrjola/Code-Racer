package org.coderacer.backend.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
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
import org.coderacer.backend.dto.AdminUserResponse;
import org.coderacer.backend.enums.UserRole;
import org.coderacer.backend.exception.ConflictException;
import org.coderacer.backend.exception.GlobalExceptionHandler;
import org.coderacer.backend.security.CurrentUserProvider;
import org.coderacer.backend.service.AdminUserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.web.PageableHandlerMethodArgumentResolver;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class AdminUserControllerTest {

  private final AdminUserService service = mock(AdminUserService.class);
  private final CurrentUserProvider currentUserProvider = mock(CurrentUserProvider.class);
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
    when(currentUserProvider.resolve(any())).thenReturn(adminId);
    mockMvc =
        MockMvcBuilders.standaloneSetup(new AdminUserController(service, currentUserProvider))
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
  void delete_returns409_whenSelfProtectionTriggered() throws Exception {
    doThrow(
            new ConflictException(
                "Admins cannot delete their own account", "SELF_ACTION_FORBIDDEN"))
        .when(service)
        .delete(id, adminId);

    mockMvc
        .perform(delete("/api/admin/users/" + id))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("SELF_ACTION_FORBIDDEN"));
  }

  @Test
  void restore_returns200() throws Exception {
    when(service.restore(id)).thenReturn(response);

    mockMvc.perform(post("/api/admin/users/" + id + "/restore")).andExpect(status().isOk());
  }
}
