package org.coderacer.backend.support;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.TestRestTemplate;
import org.springframework.http.ResponseEntity;

@IntegrationTest
class BackendHttpConnectivityTest {
  @Autowired private TestRestTemplate testRestTemplate;

  @Test
  void healthEndpointIsReachable() {
    ResponseEntity<String> response =
        testRestTemplate.getForEntity("/actuator/health", String.class);
    assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
    assertThat(response.getBody()).contains("\"status\":\"UP\"");
  }
}
