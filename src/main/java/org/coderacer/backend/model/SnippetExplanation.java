package org.coderacer.backend.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.coderacer.backend.dto.ExplanationResponse;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UuidGenerator;

@Entity
@Table(name = "snippet_explanation")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SnippetExplanation {

  @Id
  @UuidGenerator(style = UuidGenerator.Style.VERSION_7)
  @Column(nullable = false, updatable = false)
  private UUID id;

  @OneToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "snippet_id", nullable = false, unique = true, updatable = false)
  private CodeSnippet snippet;

  @Column(nullable = false, length = 2000)
  private String summary;

  @Column(name = "step_by_step", nullable = false, columnDefinition = "TEXT")
  @Convert(converter = StringListConverter.class)
  private List<String> stepByStep;

  @Column(nullable = false, columnDefinition = "TEXT")
  @Convert(converter = StringListConverter.class)
  private List<String> concepts;

  @Column(name = "best_practices", nullable = false, columnDefinition = "TEXT")
  @Convert(converter = StringListConverter.class)
  private List<String> bestPractices;

  @CreationTimestamp
  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  public SnippetExplanation(CodeSnippet snippet, ExplanationResponse response) {
    this.snippet = Objects.requireNonNull(snippet);
    this.summary = response.summary();
    this.stepByStep = response.stepByStep();
    this.concepts = response.concepts();
    this.bestPractices = response.bestPractices();
  }

  public ExplanationResponse toResponse() {
    return new ExplanationResponse(summary, stepByStep, concepts, bestPractices);
  }
}
