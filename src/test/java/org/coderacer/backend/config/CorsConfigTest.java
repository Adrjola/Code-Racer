package org.coderacer.backend.config;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@WebMvcTest(controllers = CorsConfigTest.TestController.class)
@Import(CorsConfig.class)
@TestPropertySource(properties = "app.cors.allowed-origins=http://allowed.com")
class CorsConfigTest {

  @Autowired private MockMvc mockMvc;

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
