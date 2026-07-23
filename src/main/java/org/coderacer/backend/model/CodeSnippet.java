package org.coderacer.backend.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.coderacer.backend.enums.Category;
import org.coderacer.backend.enums.Difficulty;
import org.coderacer.backend.enums.SnippetLifecycle;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.UuidGenerator;

/**
 * A snippet players race against. Every field except the lifecycle is immutable once created, so an
 * attempt's snippet can never change under it. The only permitted change is a one-way soft delete.
 */
@Entity
@Table(name = "code_snippet")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CodeSnippet {

  @Id
  @UuidGenerator(style = UuidGenerator.Style.VERSION_7)
  @Column(nullable = false, updatable = false)
  private UUID id;

  @Column(nullable = false, length = 200, updatable = false)
  private String title;

  @Column(nullable = false, length = 10000, updatable = false)
  private String source;

  @Column(name = "content_hash", nullable = false, length = 64, updatable = false)
  private String contentHash;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20, updatable = false)
  private Difficulty difficulty;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private SnippetLifecycle lifecycle = SnippetLifecycle.ACTIVE;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 30, updatable = false)
  private Category category;

  @CreationTimestamp
  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  @UpdateTimestamp
  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  @Version
  @Column(nullable = false)
  private long version;

  public CodeSnippet(
      String title, String source, String contentHash, Difficulty difficulty, Category category) {
    this.title = Objects.requireNonNull(title);
    this.source = Objects.requireNonNull(source);
    this.contentHash = Objects.requireNonNull(contentHash);
    this.difficulty = Objects.requireNonNull(difficulty);
    this.category = Objects.requireNonNull(category);
    this.lifecycle = SnippetLifecycle.ACTIVE;
  }

  public boolean isDeleted() {
    return lifecycle == SnippetLifecycle.DELETED;
  }

  /** One-way: a deleted snippet is never restored. */
  public void softDelete() {
    this.lifecycle = SnippetLifecycle.DELETED;
  }
}
