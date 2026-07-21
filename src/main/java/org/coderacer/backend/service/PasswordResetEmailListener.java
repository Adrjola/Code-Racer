package org.coderacer.backend.service;

import java.time.Duration;
import lombok.RequiredArgsConstructor;
import org.coderacer.backend.config.properties.PasswordResetProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.web.util.UriComponentsBuilder;

@Component
@RequiredArgsConstructor
public class PasswordResetEmailListener {

  private static final Logger log = LoggerFactory.getLogger(PasswordResetEmailListener.class);
  private static final int MAX_DELIVERY_ATTEMPTS = 3;
  private static final Duration RETRY_BACKOFF = Duration.ofMillis(250);

  private final EmailSender emailSender;
  private final PasswordResetProperties properties;

  @Async("emailTaskExecutor")
  @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
  public void sendPasswordResetEmail(PasswordResetRequestedEvent event) {
    EmailMessage message = passwordResetMessage(event);
    for (int attempt = 1; attempt <= MAX_DELIVERY_ATTEMPTS; attempt++) {
      try {
        emailSender.send(message);
        if (attempt > 1) {
          log.info("Password reset email delivery succeeded on attempt {}", attempt);
        }
        return;
      } catch (RuntimeException ex) {
        if (attempt == MAX_DELIVERY_ATTEMPTS) {
          log.error(
              "Password reset email delivery failed after {} attempts", MAX_DELIVERY_ATTEMPTS, ex);
          return;
        }
        log.warn("Password reset email delivery failed on attempt {}; retrying", attempt);
        if (!waitBeforeRetry()) {
          return;
        }
      }
    }
  }

  private EmailMessage passwordResetMessage(PasswordResetRequestedEvent event) {
    return new EmailMessage(
        event.email(),
        "Reset your Code Racer password",
        """
        Hi,

        Reset your Code Racer password by opening this link:
        %s

        This link expires at %s UTC. If you did not request a password reset, ignore this email.
        """
            .formatted(resetLink(event.rawToken()), event.expiresAt()));
  }

  private String resetLink(String rawToken) {
    return UriComponentsBuilder.fromUriString(properties.resetUrl())
        .queryParam("token", rawToken)
        .build()
        .toUriString();
  }

  private boolean waitBeforeRetry() {
    try {
      Thread.sleep(RETRY_BACKOFF.toMillis());
      return true;
    } catch (InterruptedException ex) {
      Thread.currentThread().interrupt();
      log.error("Password reset email delivery retry interrupted", ex);
      return false;
    }
  }
}
