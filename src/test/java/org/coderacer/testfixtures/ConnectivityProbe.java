package org.coderacer.testfixtures;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;

// Test-only scaffolding to exercise @RepositoryTest against real Postgres — not a product entity.
@Entity
public class ConnectivityProbe {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  public Long getId() {
    return id;
  }
}
