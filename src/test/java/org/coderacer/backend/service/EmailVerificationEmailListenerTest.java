package org.coderacer.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

import java.time.Instant;
import org.coderacer.backend.config.properties.EmailVerificationProperties;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class EmailVerificationEmailListenerTest {

  private final EmailSender emailSender = mock(EmailSender.class);
  private final EmailVerificationEmailListener listener =
      new EmailVerificationEmailListener(
          emailSender,
          new EmailVerificationProperties(
              java.time.Duration.ofHours(24),
              java.time.Duration.ofMinutes(2),
              "http://localhost:5173/verify-email"));

  @Test
  void sendVerificationEmail_retriesTransientDeliveryFailures() {
    doThrow(new IllegalStateException("smtp unavailable"))
        .doThrow(new IllegalStateException("smtp unavailable"))
        .doNothing()
        .when(emailSender)
        .send(any(EmailMessage.class));

    listener.sendVerificationEmail(event());

    verify(emailSender, times(3)).send(any(EmailMessage.class));
  }

  @Test
  void sendVerificationEmail_stopsAfterConfiguredRetryAttempts() {
    doThrow(new IllegalStateException("smtp unavailable"))
        .when(emailSender)
        .send(any(EmailMessage.class));

    listener.sendVerificationEmail(event());

    verify(emailSender, times(3)).send(any(EmailMessage.class));
  }

  @Test
  void sendVerificationEmail_buildsLinkFromRawToken() {
    listener.sendVerificationEmail(event());

    ArgumentCaptor<EmailMessage> messageCaptor = ArgumentCaptor.forClass(EmailMessage.class);
    verify(emailSender).send(messageCaptor.capture());
    assertThat(messageCaptor.getValue().text())
        .contains("http://localhost:5173/verify-email?token=raw-token");
  }

  private EmailVerificationRequestedEvent event() {
    return new EmailVerificationRequestedEvent(
        "player@example.com", "raw-token", Instant.parse("2026-07-17T10:15:30Z"));
  }
}
