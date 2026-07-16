package org.coderacer.backend.snippet.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.coderacer.backend.category.model.Category;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.UuidGenerator;

@Entity
@Table(name = "code_snippet")
@Getter
@Setter
@NoArgsConstructor
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

  @Column(nullable = false, length = 10000)
  private String source;

  @Column(name = "content_hash", nullable = false, length = 64)
  private String contentHash;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private Difficulty difficulty;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private SnippetLifecycle lifecycle = SnippetLifecycle.ACTIVE;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "category_id", nullable = false)
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
}
