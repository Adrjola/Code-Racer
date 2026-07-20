package org.coderacer.backend.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.coderacer.backend.enums.Difficulty;
import org.coderacer.backend.enums.SoloAttemptState;
import org.coderacer.backend.exception.IllegalSoloAttemptStateTransitionException;

@Entity
@Table(name = "solo_attempts")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SoloAttempt {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @NotNull
  @ManyToOne(fetch = FetchType.LAZY)
  private User user;

  @NotNull
  @ManyToOne(fetch = FetchType.EAGER)
  private CodeSnippet codeSnippet;

  @NotNull
  @Enumerated(EnumType.STRING)
  private SoloAttemptState state;

  @NotNull
  @Enumerated(EnumType.STRING)
  private Difficulty difficulty;

  @NotNull private Instant startedAt;

  private Instant finishedAt;

  private Long durationMs;

  private Integer cpm;

  @Version private long version;

  public SoloAttempt(User user, CodeSnippet codeSnippet, Difficulty difficulty, Instant startedAt) {
    this.user = user;
    this.codeSnippet = codeSnippet;
    this.difficulty = difficulty;
    this.startedAt = startedAt;
    this.state = SoloAttemptState.COUNTDOWN;
  }

  public void activate() {
    transitionTo(SoloAttemptState.ACTIVE);
  }

  public void complete(Instant finishedAt, long durationMs, int cpm) {
    transitionTo(SoloAttemptState.COMPLETED);
    this.finishedAt = finishedAt;
    this.durationMs = durationMs;
    this.cpm = cpm;
  }

  public void abandon() {
    transitionTo(SoloAttemptState.ABANDONED);
  }

  public void expire() {
    transitionTo(SoloAttemptState.EXPIRED);
  }

  public void invalidate() {
    transitionTo(SoloAttemptState.INVALIDATED);
  }

  private void transitionTo(SoloAttemptState target) {
    if (!this.state.canTransitionTo(target)) {
      throw new IllegalSoloAttemptStateTransitionException(
          "Cannot transition from " + this.state + " to " + target);
    }
    this.state = target;
  }
}
