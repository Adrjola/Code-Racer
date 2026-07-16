package org.coderacer.backend.snippet.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.coderacer.backend.category.model.Category;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.UuidGenerator;

@Entity
@Table(name = "code_snippet")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CodeSnippet {

  @Id
  @UuidGenerator(style = UuidGenerator.Style.VERSION_7)
  @Column(nullable = false, updatable = false)
  private UUID id;

  @Column(name = "snippet_id", nullable = false, updatable = false)
  private UUID snippetId;

  @Column(name = "revision_number", nullable = false, updatable = false)
  private int revisionNumber;

  @Column(nullable = false, length = 200)
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

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "category_id", nullable = false, updatable = false)
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
      UUID snippetId,
      int revisionNumber,
      String title,
      String source,
      String contentHash,
      Difficulty difficulty,
      Category category,
      SnippetLifecycle lifecycle) {
    if (revisionNumber < 1) {
      throw new IllegalArgumentException("revisionNumber must be positive");
    }
    this.snippetId = Objects.requireNonNull(snippetId);
    this.revisionNumber = revisionNumber;
    this.title = Objects.requireNonNull(title);
    this.source = Objects.requireNonNull(source);
    this.contentHash = Objects.requireNonNull(contentHash);
    this.difficulty = Objects.requireNonNull(difficulty);
    this.category = Objects.requireNonNull(category);
    this.lifecycle = Objects.requireNonNull(lifecycle);
  }

  public static CodeSnippet firstRevision(
      String title, String source, String contentHash, Difficulty difficulty, Category category) {
    return new CodeSnippet(
        UUID.randomUUID(),
        1,
        title,
        source,
        contentHash,
        difficulty,
        category,
        SnippetLifecycle.ACTIVE);
  }

  public static CodeSnippet nextRevision(
      UUID snippetId,
      int revisionNumber,
      String title,
      String source,
      String contentHash,
      Difficulty difficulty,
      Category category) {
    return new CodeSnippet(
        snippetId,
        revisionNumber,
        title,
        source,
        contentHash,
        difficulty,
        category,
        SnippetLifecycle.ACTIVE);
  }

  public void rename(String title) {
    this.title = Objects.requireNonNull(title);
  }

  public void activate() {
    this.lifecycle = SnippetLifecycle.ACTIVE;
  }

  public void deactivate() {
    this.lifecycle = SnippetLifecycle.INACTIVE;
  }

  public void retire() {
    this.lifecycle = SnippetLifecycle.RETIRED;
  }

  public void softDelete() {
    this.lifecycle = SnippetLifecycle.DELETED;
  }

  public void restore() {
    this.lifecycle = SnippetLifecycle.INACTIVE;
  }
}
