package org.coderacer.backend.support;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.jpa.repository.JpaRepository;

@RepositoryTest
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

// Test-only scaffolding to exercise @RepositoryTest against real Postgres — not a product entity.
@Entity
class ConnectivityProbe {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  Long getId() {
    return id;
  }
}

interface ConnectivityProbeRepository extends JpaRepository<ConnectivityProbe, Long> {}
