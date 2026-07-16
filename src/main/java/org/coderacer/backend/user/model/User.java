package org.coderacer.backend.user.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.UuidGenerator;

/** A registered Code Racer account. */
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

  @Column(name = "password_hash", nullable = false, length = 255)
  private String passwordHash;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private UserRole role = UserRole.USER;

  @Column(name = "email_verified", nullable = false)
  private boolean emailVerified;

  @Column(nullable = false)
  private boolean enabled = true;

  @Column(nullable = false)
  private boolean deleted;

  @Column(name = "token_valid_from", nullable = false)
  private Instant tokenValidFrom = Instant.EPOCH;

  public boolean canAuthenticate() {
    return emailVerified && enabled && !deleted;
  }

  @CreationTimestamp
  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  @UpdateTimestamp
  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;
}
