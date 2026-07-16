package org.coderacer.backend.user.verification.repository;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.coderacer.backend.user.model.User;
import org.coderacer.backend.user.verification.model.EmailVerificationToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface EmailVerificationTokenRepository
    extends JpaRepository<EmailVerificationToken, UUID> {

  Optional<EmailVerificationToken> findByTokenHash(String tokenHash);

  Optional<EmailVerificationToken> findFirstByUserOrderByCreatedAtDesc(User user);

  @Modifying
  @Query(
      """
      update EmailVerificationToken token
      set token.revokedAt = :revokedAt
      where token.user = :user
        and token.usedAt is null
        and token.revokedAt is null
      """)
  int revokeActiveTokensForUser(@Param("user") User user, @Param("revokedAt") Instant revokedAt);

  @Modifying
  @Query(
      """
      update EmailVerificationToken token
      set token.revokedAt = :revokedAt
      where token.user = :user
        and token.id <> :excludedTokenId
        and token.usedAt is null
        and token.revokedAt is null
      """)
  int revokeOtherActiveTokensForUser(
      @Param("user") User user,
      @Param("excludedTokenId") UUID excludedTokenId,
      @Param("revokedAt") Instant revokedAt);
}
