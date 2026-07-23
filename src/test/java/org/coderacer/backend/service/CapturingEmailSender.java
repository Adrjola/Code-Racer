package org.coderacer.backend.service;

import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

@Component
@Primary
public class CapturingEmailSender implements EmailSender {

  private final List<EmailMessage> sentMessages = new CopyOnWriteArrayList<>();

  @Override
  public void send(EmailMessage message) {
    sentMessages.add(message);
  }

  public List<EmailMessage> sentMessages() {
    return List.copyOf(sentMessages);
  }

  public void clear() {
    sentMessages.clear();
  }
}
