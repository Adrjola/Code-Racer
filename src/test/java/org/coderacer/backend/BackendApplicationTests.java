package org.coderacer.backend;

import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;

@Disabled("Fails due to missing Docker/Testcontainers in current environment")
class BackendApplicationTests extends AbstractPostgresIntegrationTest {

  @Test
  void contextLoads() {}
}
