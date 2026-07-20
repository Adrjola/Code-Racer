package org.coderacer.backend.service;

public interface EmailSender {

  void send(EmailMessage message);
}
