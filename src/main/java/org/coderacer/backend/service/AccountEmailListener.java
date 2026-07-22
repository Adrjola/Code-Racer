package org.coderacer.backend.service;

import java.time.Duration;
import lombok.RequiredArgsConstructor;
import org.coderacer.backend.config.properties.EmailVerificationProperties;
import org.coderacer.backend.config.properties.PasswordResetProperties;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.web.util.UriComponentsBuilder;

@Component
@RequiredArgsConstructor
public class AccountEmailListener {

  private final EmailSender emailSender;
  private final EmailVerificationProperties verificationProperties;
  private final PasswordResetProperties passwordResetProperties;

  @Async("emailTaskExecutor")
  @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
  public void sendVerificationEmail(EmailVerificationRequestedEvent event) {
    emailSender.send(verificationMessage(event));
  }

  @Async("emailTaskExecutor")
  @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
  public void sendPasswordResetEmail(PasswordResetRequestedEvent event) {
    emailSender.send(passwordResetMessage(event));
  }

  private EmailMessage verificationMessage(EmailVerificationRequestedEvent event) {
    return new EmailMessage(
        event.email(),
        "Verify your Code Racer account",
        """
        Hi,

        Verify your Code Racer account by opening this link:
        %s

        This link expires in %s. If you did not create a Code Racer account, ignore this email.
        """
            .formatted(
                link(verificationProperties.verificationUrl(), event.rawToken()),
                formatDuration(verificationProperties.tokenTtl())));
  }

  private EmailMessage passwordResetMessage(PasswordResetRequestedEvent event) {
    return new EmailMessage(
        event.email(),
        "Reset your Code Racer password",
        """
        Hi,

        Reset your Code Racer password by opening this link:
        %s

        This link expires in %s. If you did not request a password reset, ignore this email.
        """
            .formatted(
                link(passwordResetProperties.resetUrl(), event.rawToken()),
                formatDuration(passwordResetProperties.tokenTtl())));
  }

  private String link(String baseUrl, String rawToken) {
    return UriComponentsBuilder.fromUriString(baseUrl)
        .queryParam("token", rawToken)
        .build()
        .toUriString();
  }

  private String formatDuration(Duration duration) {
    long seconds = duration.toSeconds();
    if (seconds < 60) {
      return plural(seconds, "second");
    }
    if (seconds % 3600 == 0) {
      return plural(seconds / 3600, "hour");
    }
    return plural(seconds / 60, "minute");
  }

  private String plural(long value, String unit) {
    return value + " " + unit + (value == 1 ? "" : "s");
  }
}
