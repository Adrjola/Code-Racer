package org.coderacer.backend.service;

import java.time.Duration;
import lombok.RequiredArgsConstructor;
import org.coderacer.backend.config.properties.EmailVerificationProperties;
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
public class AccountEmailListener {

  private static final Logger log = LoggerFactory.getLogger(AccountEmailListener.class);
  private static final int MAX_DELIVERY_ATTEMPTS = 3;
  private static final Duration RETRY_BACKOFF = Duration.ofMillis(250);

  private final EmailSender emailSender;
  private final EmailVerificationProperties verificationProperties;
  private final PasswordResetProperties passwordResetProperties;

  @Async("emailTaskExecutor")
  @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
  public void sendVerificationEmail(EmailVerificationRequestedEvent event) {
    send(verificationMessage(event), "Verification email");
  }

  @Async("emailTaskExecutor")
  @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
  public void sendPasswordResetEmail(PasswordResetRequestedEvent event) {
    send(passwordResetMessage(event), "Password reset email");
  }

  private void send(EmailMessage message, String emailType) {
    for (int attempt = 1; attempt <= MAX_DELIVERY_ATTEMPTS; attempt++) {
      try {
        emailSender.send(message);
        if (attempt > 1) {
          log.info("{} delivery succeeded on attempt {}", emailType, attempt);
        }
        return;
      } catch (RuntimeException ex) {
        if (attempt == MAX_DELIVERY_ATTEMPTS) {
          log.error("{} delivery failed after {} attempts", emailType, MAX_DELIVERY_ATTEMPTS, ex);
          return;
        }
        log.warn("{} delivery failed on attempt {}; retrying", emailType, attempt);
        if (!waitBeforeRetry(emailType)) {
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
        Hi,

        Verify your Code Racer account by opening this link:
        %s

        This link expires at %s UTC. If you did not create a Code Racer account, ignore this email.
        """
            .formatted(
                link(verificationProperties.verificationUrl(), event.rawToken()),
                event.expiresAt()));
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
            .formatted(
                link(passwordResetProperties.resetUrl(), event.rawToken()), event.expiresAt()));
  }

  private String link(String baseUrl, String rawToken) {
    return UriComponentsBuilder.fromUriString(baseUrl)
        .queryParam("token", rawToken)
        .build()
        .toUriString();
  }

  private boolean waitBeforeRetry(String emailType) {
    try {
      Thread.sleep(RETRY_BACKOFF.toMillis());
      return true;
    } catch (InterruptedException ex) {
      Thread.currentThread().interrupt();
      log.error("{} delivery retry interrupted", emailType, ex);
      return false;
    }
  }
}
