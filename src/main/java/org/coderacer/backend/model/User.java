package org.coderacer.backend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.coderacer.backend.enums.UserRole;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.UuidGenerator;

@Entity
@Table(name = "user_account")
@Getter
@Setter
@NoArgsConstructor
public class User {

  @Id
  @UuidGenerator(style = UuidGenerator.Style.VERSION_7)
  @Column(nullable = false, updatable = false)
  private UUID id;

  @Column(nullable = false, unique = true, length = 120)
  private String email;

  @Column(nullable = false, unique = true, length = 20)
  private String username;

  @Column(name = "username_normalized", nullable = false, unique = true, length = 20)
  private String usernameNormalized;

  @Column(name = "password_hash", nullable = false, length = 255)
  private String passwordHash;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private UserRole role = UserRole.USER;

  @Column(name = "email_verified", nullable = false)
  private boolean emailVerified;

  @Column(nullable = false)
  private boolean deleted;

  @Column(name = "token_valid_from", nullable = false)
  private Instant tokenValidFrom = Instant.EPOCH;

  @Column(name = "verification_email_resent_at")
  private Instant verificationEmailResentAt;

  @Column(name = "password_reset_email_sent_at")
  private Instant passwordResetEmailResentAt;

  public boolean canAuthenticate() {
    return emailVerified && !deleted;
  }

  public boolean canVerifyEmail() {
    return !emailVerified && !deleted;
  }

  public boolean canResendVerificationEmail(Instant now, Duration cooldown) {
    return cooldown.isZero()
        || verificationEmailResentAt == null
        || !verificationEmailResentAt.plus(cooldown).isAfter(now);
  }

  public void markVerificationEmailResent(Instant resentAt) {
    this.verificationEmailResentAt = resentAt;
  }

  public boolean canResendPasswordResetEmail(Instant now, Duration cooldown) {
    return cooldown.isZero()
        || passwordResetEmailResentAt == null
        || !passwordResetEmailResentAt.plus(cooldown).isAfter(now);
  }

  public void markPasswordResetEmailResent(Instant resentAt) {
    this.passwordResetEmailResentAt = resentAt;
  }

  public void setUsername(String username) {
    this.username = username;
    this.usernameNormalized = normalize(username);
  }

  private String normalize(String value) {
    return value.trim().toLowerCase();
  }

  @CreationTimestamp
  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  @UpdateTimestamp
  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;
}
