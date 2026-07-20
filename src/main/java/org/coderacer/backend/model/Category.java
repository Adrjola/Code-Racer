package org.coderacer.backend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.UuidGenerator;

@Entity
@Table(name = "category")
@Getter
@Setter
@NoArgsConstructor
public class Category {

  @Id
  @UuidGenerator(style = UuidGenerator.Style.VERSION_7)
  @Column(nullable = false, updatable = false)
  private UUID id;

  @Column(nullable = false, unique = true, length = 100)
  private String name;

  @Column(length = 500)
  private String description;

  @Column(nullable = false)
  private boolean active = true;

  @CreationTimestamp
  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  @UpdateTimestamp
  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;
}
