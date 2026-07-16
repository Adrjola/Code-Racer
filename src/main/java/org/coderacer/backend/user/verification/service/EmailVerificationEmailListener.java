package org.coderacer.backend.user.verification.service;

import java.time.Duration;
import lombok.RequiredArgsConstructor;
import org.coderacer.backend.email.EmailMessage;
import org.coderacer.backend.email.EmailSender;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
public class EmailVerificationEmailListener {

  private static final Logger log = LoggerFactory.getLogger(EmailVerificationEmailListener.class);
  private static final int MAX_DELIVERY_ATTEMPTS = 3;
  private static final Duration RETRY_BACKOFF = Duration.ofMillis(250);

  private final EmailSender emailSender;

  @Async("emailTaskExecutor")
  @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
  public void sendVerificationEmail(EmailVerificationRequestedEvent event) {
    EmailMessage message = verificationMessage(event);
    for (int attempt = 1; attempt <= MAX_DELIVERY_ATTEMPTS; attempt++) {
      try {
        emailSender.send(message);
        if (attempt > 1) {
          log.info(
              "Verification email delivery succeeded for user {} on attempt {}",
              event.userId(),
              attempt);
        }
        return;
      } catch (RuntimeException ex) {
        if (attempt == MAX_DELIVERY_ATTEMPTS) {
          log.error(
              "Verification email delivery failed for user {} after {} attempts",
              event.userId(),
              MAX_DELIVERY_ATTEMPTS,
              ex);
          return;
        }
        log.warn(
            "Verification email delivery failed for user {} on attempt {}; retrying",
            event.userId(),
            attempt);
        if (!waitBeforeRetry(event)) {
          return;
        }
      }
    }
  }

  private EmailMessage verificationMessage(EmailVerificationRequestedEvent event) {
    return new EmailMessage(
        event.email(),
        "Verify your Code Racer account",
        """
        Hi %s,

        Verify your Code Racer account by opening this link:
        %s

        This link expires at %s UTC. If you did not create a Code Racer account, ignore this email.
        """
            .formatted(event.username(), event.verificationLink(), event.expiresAt()));
  }

  private boolean waitBeforeRetry(EmailVerificationRequestedEvent event) {
    try {
      Thread.sleep(RETRY_BACKOFF.toMillis());
      return true;
    } catch (InterruptedException ex) {
      Thread.currentThread().interrupt();
      log.error("Verification email delivery retry interrupted for user {}", event.userId(), ex);
      return false;
    }
  }
}
