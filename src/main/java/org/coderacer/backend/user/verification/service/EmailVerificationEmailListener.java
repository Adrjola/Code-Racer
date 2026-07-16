package org.coderacer.backend.user.verification.service;

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

  private final EmailSender emailSender;

  @Async("emailTaskExecutor")
  @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
  public void sendVerificationEmail(EmailVerificationRequestedEvent event) {
    try {
      emailSender.send(
          new EmailMessage(
              event.email(),
              "Verify your Code Racer account",
              """
              Hi %s,

              Verify your Code Racer account by opening this link:
              %s

              This link expires at %s UTC. If you did not create a Code Racer account, ignore this email.
              """
                  .formatted(event.username(), event.verificationLink(), event.expiresAt())));
    } catch (RuntimeException ex) {
      log.error("Verification email delivery failed for user {}", event.userId(), ex);
    }
  }
}
