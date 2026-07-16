package org.coderacer.backend.email;

public record EmailMessage(String to, String subject, String text) {}
