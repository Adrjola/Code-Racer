package org.coderacer.backend.service;

import lombok.RequiredArgsConstructor;
import org.coderacer.backend.config.properties.EmailDeliveryProperties;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
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
