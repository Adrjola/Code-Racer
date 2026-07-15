package org.coderacer.backend.category;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
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
import org.coderacer.backend.category.dto.CategoryResponse;
import org.coderacer.backend.common.exception.GlobalExceptionHandler;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.web.PageableHandlerMethodArgumentResolver;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class CategoryControllerTest {

  private final CategoryService service = mock(CategoryService.class);
  private final UUID id = UUID.randomUUID();
  private final CategoryResponse response =
      new CategoryResponse(id, "Arrays", "Array problems", true, Instant.now(), Instant.now());
  private MockMvc mockMvc;

  @BeforeEach
  void setUp() {
    mockMvc =
        MockMvcBuilders.standaloneSetup(
                new AdminCategoryController(service), new CategoryController(service))
            .setControllerAdvice(new GlobalExceptionHandler())
            .setCustomArgumentResolvers(new PageableHandlerMethodArgumentResolver())
            .build();
  }

  @Test
  void create_returns201_withCreatedCategory() throws Exception {
    when(service.create(any())).thenReturn(response);

    mockMvc
        .perform(
            post("/api/admin/categories")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Arrays\",\"description\":\"Array problems\"}"))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.data.name").value("Arrays"));
  }

  @Test
  void create_returns400_whenNameIsBlank() throws Exception {
    mockMvc
        .perform(
            post("/api/admin/categories")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"\",\"description\":\"x\"}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
  }

  @Test
  void update_returns200() throws Exception {
    when(service.update(eq(id), any())).thenReturn(response);

    mockMvc
        .perform(
            put("/api/admin/categories/" + id)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Arrays\",\"description\":\"Array problems\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.id").value(id.toString()));
  }

  @Test
  void get_returns200() throws Exception {
    when(service.getById(id)).thenReturn(response);

    mockMvc.perform(get("/api/admin/categories/" + id)).andExpect(status().isOk());
  }

  @Test
  void list_returns200() throws Exception {
    when(service.list(any())).thenReturn(new PageImpl<>(List.of(response)));

    mockMvc.perform(get("/api/admin/categories")).andExpect(status().isOk());
  }

  @Test
  void delete_returns204_andSoftDeletes() throws Exception {
    mockMvc.perform(delete("/api/admin/categories/" + id)).andExpect(status().isNoContent());

    verify(service).delete(id);
  }

  @Test
  void restore_returns200() throws Exception {
    when(service.restore(id)).thenReturn(response);

    mockMvc.perform(post("/api/admin/categories/" + id + "/restore")).andExpect(status().isOk());
  }

  @Test
  void publicList_returnsActiveCategories() throws Exception {
    when(service.listActive(any())).thenReturn(new PageImpl<>(List.of(response)));

    mockMvc
        .perform(get("/api/categories"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.content[0].name").value("Arrays"));
  }
}
