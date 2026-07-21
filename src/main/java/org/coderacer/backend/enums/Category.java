package org.coderacer.backend.enums;

/** The fixed set of snippet categories. Adding one means adding a constant here. */
public enum Category {
  JAVA("Java"),
  SQL("SQL"),
  REST_APIS("REST APIs"),
  TESTING("Testing");

  private final String displayName;

  Category(String displayName) {
    this.displayName = displayName;
  }

  public String getDisplayName() {
    return displayName;
  }
}
