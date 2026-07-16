package org.coderacer.backend.auth.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class LoginRequest {

  @Size(max = 120)
  private String identifier;

  @Size(max = 120)
  private String username;

  @Size(max = 120)
  private String email;

  @NotBlank
  @Size(max = 72)
  private String password;

  public LoginRequest() {}

  public LoginRequest(String identifier, String password) {
    this.identifier = identifier;
    this.password = password;
  }

  public String identifier() {
    if (hasText(identifier)) {
      return identifier;
    }
    if (hasText(username)) {
      return username;
    }
    return email;
  }

  public String password() {
    return password;
  }

  public void setIdentifier(String identifier) {
    this.identifier = identifier;
  }

  public void setUsername(String username) {
    this.username = username;
  }

  public void setEmail(String email) {
    this.email = email;
  }

  public void setPassword(String password) {
    this.password = password;
  }

  @AssertTrue(message = "identifier must not be blank")
  public boolean isIdentifierProvided() {
    return hasText(identifier());
  }

  private boolean hasText(String value) {
    return value != null && !value.isBlank();
  }
}
