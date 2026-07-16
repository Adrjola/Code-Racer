package org.coderacer.backend.email;

public interface EmailSender {

  void send(EmailMessage message);
}
