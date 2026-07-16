package org.coderacer.backend.email;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@ConditionalOnProperty(
    name = "app.email.delivery.mode",
    havingValue = "smtp",
    matchIfMissing = true)
class SmtpEmailSender implements EmailSender {

  private final JavaMailSender mailSender;
  private final EmailDeliveryProperties properties;

  @Override
  public void send(EmailMessage message) {
    SimpleMailMessage mail = new SimpleMailMessage();
    mail.setFrom(properties.from());
    mail.setTo(message.to());
    mail.setSubject(message.subject());
    mail.setText(message.text());
    mailSender.send(mail);
  }
}
