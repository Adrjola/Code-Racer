package org.coderacer.backend.enums;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class SoloAttemptStateTest {

  @Test
  void countdownCanTransitionToActiveOrAbandoned() {
    assertThat(SoloAttemptState.COUNTDOWN.canTransitionTo(SoloAttemptState.ACTIVE)).isTrue();
    assertThat(SoloAttemptState.COUNTDOWN.canTransitionTo(SoloAttemptState.ABANDONED)).isTrue();
    assertThat(SoloAttemptState.COUNTDOWN.canTransitionTo(SoloAttemptState.COMPLETED)).isFalse();
  }

  @Test
  void activeCanTransitionToAnyTerminalState() {
    assertThat(SoloAttemptState.ACTIVE.canTransitionTo(SoloAttemptState.COMPLETED)).isTrue();
    assertThat(SoloAttemptState.ACTIVE.canTransitionTo(SoloAttemptState.ABANDONED)).isTrue();
    assertThat(SoloAttemptState.ACTIVE.canTransitionTo(SoloAttemptState.EXPIRED)).isTrue();
    assertThat(SoloAttemptState.ACTIVE.canTransitionTo(SoloAttemptState.INVALIDATED)).isTrue();
    assertThat(SoloAttemptState.ACTIVE.canTransitionTo(SoloAttemptState.COUNTDOWN)).isFalse();
  }

  @Test
  void terminalStatesCannotTransitionAnywhere() {
    assertThat(SoloAttemptState.COMPLETED.canTransitionTo(SoloAttemptState.ACTIVE)).isFalse();
    assertThat(SoloAttemptState.ABANDONED.canTransitionTo(SoloAttemptState.COMPLETED)).isFalse();
    assertThat(SoloAttemptState.EXPIRED.canTransitionTo(SoloAttemptState.ACTIVE)).isFalse();
    assertThat(SoloAttemptState.INVALIDATED.canTransitionTo(SoloAttemptState.COMPLETED)).isFalse();
  }
}
