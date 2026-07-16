package org.coderacer.backend.soloattempt.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Immutable;

@Entity
@Table(name = "code_snippets")
@Immutable
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CodeSnippet {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @NotBlank private String content;

  @NotNull
  @Enumerated(EnumType.STRING)
  private Difficulty difficulty;

  public CodeSnippet(String content, Difficulty difficulty) {
    this.content = content;
    this.difficulty = difficulty;
  }
}
