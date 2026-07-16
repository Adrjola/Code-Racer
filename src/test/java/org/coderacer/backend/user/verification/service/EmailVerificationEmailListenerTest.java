package org.coderacer.backend.user.verification.service;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

import java.time.Instant;
import java.util.UUID;
import org.coderacer.backend.email.EmailMessage;
import org.coderacer.backend.email.EmailSender;
import org.junit.jupiter.api.Test;

class EmailVerificationEmailListenerTest {

  private final EmailSender emailSender = mock(EmailSender.class);
  private final EmailVerificationEmailListener listener =
      new EmailVerificationEmailListener(emailSender);

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

  private EmailVerificationRequestedEvent event() {
    return new EmailVerificationRequestedEvent(
        UUID.randomUUID(),
        "player@example.com",
        "player",
        "http://localhost:5173/verify-email?token=raw-token",
        Instant.parse("2026-07-17T10:15:30Z"));
  }
}
