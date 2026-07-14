package org.coderacer.backend.config;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.filter.CorsFilter;

class CorsConfigTest {

  private MockMvc mockMvc;

  @BeforeEach
  void setUp() {
    CorsConfig corsConfig = new CorsConfig();
    // Inject property manually since we are in a standalone setup
    corsConfig.setAllowedOrigins(List.of("http://allowed.com"));
    CorsFilter corsFilter = corsConfig.corsFilter();

    mockMvc = MockMvcBuilders.standaloneSetup(new TestController()).addFilters(corsFilter).build();
  }

  @Test
  void shouldAllowCORSFromAllowedOrigin() throws Exception {
    mockMvc
        .perform(
            options("/api/test")
                .header("Origin", "http://allowed.com")
                .header("Access-Control-Request-Method", "GET"))
        .andExpect(status().isOk())
        .andExpect(header().string("Access-Control-Allow-Origin", "http://allowed.com"));
  }

  @Test
  void shouldRejectCORSFromUnallowedOrigin() throws Exception {
    mockMvc
        .perform(
            options("/api/test")
                .header("Origin", "http://unallowed.com")
                .header("Access-Control-Request-Method", "GET"))
        .andExpect(status().isForbidden());
  }

  @RestController
  static class TestController {
    @GetMapping("/api/test")
    public void test() {}
  }
}
