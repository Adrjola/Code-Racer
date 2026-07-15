package org.coderacer.backend.common.logging;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;

class CorrelationIdFilterTest {

  private CorrelationIdFilter filter;

  @BeforeEach
  void setUp() {
    filter = new CorrelationIdFilter();
    MDC.clear();
  }

  @Test
  void shouldGenerateNewCorrelationIdWhenHeaderIsMissing() throws IOException, ServletException {
    HttpServletRequest request = mock(HttpServletRequest.class);
    HttpServletResponse response = mock(HttpServletResponse.class);
    FilterChain chain = mock(FilterChain.class);

    when(request.getHeader("X-Correlation-ID")).thenReturn(null);

    // Mock chain.doFilter to check MDC while filter is active
    doAnswer(invocation -> {
      String correlationId = MDC.get("correlationId");
      assertThat(correlationId).isNotNull().isNotBlank();
      return null;
    }).when(chain).doFilter(request, response);

    filter.doFilter(request, response, chain);

    verify(response).setHeader(eq("X-Correlation-ID"), anyString());
    verify(chain).doFilter(request, response);
    assertThat(MDC.get("correlationId")).isNull(); // Verify cleanup in finally block
  }

  @Test
  void shouldReuseCorrelationIdFromHeaderIfPresent() throws IOException, ServletException {
    HttpServletRequest request = mock(HttpServletRequest.class);
    HttpServletResponse response = mock(HttpServletResponse.class);
    FilterChain chain = mock(FilterChain.class);
    String existingId = "test-correlation-id";

    when(request.getHeader("X-Correlation-ID")).thenReturn(existingId);

    filter.doFilter(request, response, chain);

    verify(response).setHeader("X-Correlation-ID", existingId);
    verify(chain).doFilter(request, response);
    assertThat(MDC.get("correlationId")).isNull();
  }

  @Test
  void shouldHandleNonHttpRequestsGracefully() throws IOException, ServletException {
    jakarta.servlet.ServletRequest request = mock(jakarta.servlet.ServletRequest.class);
    jakarta.servlet.ServletResponse response = mock(jakarta.servlet.ServletResponse.class);
    FilterChain chain = mock(FilterChain.class);

    filter.doFilter(request, response, chain);

    verify(chain).doFilter(request, response);
    assertThat(MDC.get("correlationId")).isNull();
  }
}
