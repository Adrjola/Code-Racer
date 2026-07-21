package org.coderacer.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

import java.time.Duration;
import java.time.Instant;
import org.coderacer.backend.config.properties.EmailVerificationProperties;
import org.coderacer.backend.config.properties.PasswordResetProperties;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class AccountEmailListenerTest {

  private final EmailSender emailSender = mock(EmailSender.class);
  private final AccountEmailListener listener =
      new AccountEmailListener(
          emailSender,
          new EmailVerificationProperties(
              Duration.ofHours(24), Duration.ofMinutes(2), "http://localhost:5173/verify-email"),
          new PasswordResetProperties(
              Duration.ofHours(1), Duration.ofMinutes(2), "http://localhost:5173/reset"));

  @Test
  void sendVerificationEmail_buildsLinkFromRawToken() {
    listener.sendVerificationEmail(verificationEvent());

    ArgumentCaptor<EmailMessage> messageCaptor = ArgumentCaptor.forClass(EmailMessage.class);
    verify(emailSender).send(messageCaptor.capture());
    assertThat(messageCaptor.getValue().subject()).isEqualTo("Verify your Code Racer account");
    assertThat(messageCaptor.getValue().text())
        .contains("http://localhost:5173/verify-email?token=raw-token");
  }

  @Test
  void sendPasswordResetEmail_buildsLinkFromRawToken() {
    listener.sendPasswordResetEmail(resetEvent());

    ArgumentCaptor<EmailMessage> messageCaptor = ArgumentCaptor.forClass(EmailMessage.class);
    verify(emailSender).send(messageCaptor.capture());
    assertThat(messageCaptor.getValue().subject()).isEqualTo("Reset your Code Racer password");
    assertThat(messageCaptor.getValue().text())
        .contains("http://localhost:5173/reset?token=raw-reset-token");
  }

  @Test
  void send_retriesTransientDeliveryFailures() {
    doThrow(new IllegalStateException("smtp unavailable"))
        .doThrow(new IllegalStateException("smtp unavailable"))
        .doNothing()
        .when(emailSender)
        .send(any(EmailMessage.class));

    listener.sendVerificationEmail(verificationEvent());

    verify(emailSender, times(3)).send(any(EmailMessage.class));
  }

  private EmailVerificationRequestedEvent verificationEvent() {
    return new EmailVerificationRequestedEvent(
        "player@example.com", "raw-token", Instant.parse("2026-07-17T10:15:30Z"));
  }

  private PasswordResetRequestedEvent resetEvent() {
    return new PasswordResetRequestedEvent(
        "player@example.com", "raw-reset-token", Instant.parse("2026-07-17T10:15:30Z"));
  }
}
