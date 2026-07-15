package org.coderacer.backend.support;

import static org.assertj.core.api.Assertions.assertThat;

import org.coderacer.testfixtures.ConnectivityProbe;
import org.coderacer.testfixtures.ConnectivityProbeRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.TestPropertySource;

@RepositoryTest
@TestPropertySource(properties = "spring.jpa.hibernate.ddl-auto=create-drop")
class PostgresConnectivityRepositoryTest {

  @Autowired private ConnectivityProbeRepository repository;

  @Test
  void savesAndReadsBackFromRealPostgres() {
    ConnectivityProbe saved = repository.save(new ConnectivityProbe());

    assertThat(saved.getId()).isNotNull();
    assertThat(repository.findById(saved.getId())).isPresent();
  }

  @Test
  void testsStartFromAFreshDatabase() {
    assertThat(repository.findAll()).isEmpty();
  }
}
