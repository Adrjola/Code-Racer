package org.coderacer.backend;

import org.coderacer.backend.support.PostgresTestContainersConfiguration;
import org.junit.jupiter.api.Tag;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

@SpringBootTest
@Import(PostgresTestContainersConfiguration.class)
@Tag("integration")
public abstract class AbstractPostgresIntegrationTest {}
