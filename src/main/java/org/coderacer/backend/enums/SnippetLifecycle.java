package org.coderacer.backend.enums;

/**
 * Snippets are immutable once created, so they are either available to race or soft-deleted. A
 * deleted snippet stays readable in the admin catalog but is hidden from everything a player can
 * see, and it cannot be brought back.
 */
public enum SnippetLifecycle {
  ACTIVE,
  DELETED
}
