package org.coderacer.backend.common.logging;

import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.UUID;
import java.util.regex.Pattern;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class CorrelationIdFilter implements Filter {

  private static final String CORRELATION_ID_HEADER = "X-Correlation-ID";
  private static final String MDC_KEY = "correlationId";
  private static final int MAX_CORRELATION_ID_LENGTH = 128;
  private static final Pattern SAFE_CORRELATION_ID = Pattern.compile("[A-Za-z0-9._:-]+");

  @Override
  public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
      throws IOException, ServletException {
    if (request instanceof HttpServletRequest httpServletRequest
        && response instanceof HttpServletResponse httpServletResponse) {
      String correlationId =
          resolveCorrelationId(httpServletRequest.getHeader(CORRELATION_ID_HEADER));

      MDC.put(MDC_KEY, correlationId);
      httpServletResponse.setHeader(CORRELATION_ID_HEADER, correlationId);

      try {
        chain.doFilter(request, response);
      } finally {
        MDC.remove(MDC_KEY);
      }
    } else {
      chain.doFilter(request, response);
    }
  }

  private static String resolveCorrelationId(String headerValue) {
    if (headerValue == null) {
      return UUID.randomUUID().toString();
    }

    String correlationId = headerValue.trim();
    if (correlationId.isEmpty()
        || correlationId.length() > MAX_CORRELATION_ID_LENGTH
        || !SAFE_CORRELATION_ID.matcher(correlationId).matches()) {
      return UUID.randomUUID().toString();
    }

    return correlationId;
  }
}
