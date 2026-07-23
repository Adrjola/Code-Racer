package org.coderacer.backend.service;

public record EmailMessage(String to, String subject, String text) {}
