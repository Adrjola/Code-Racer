package org.coderacer.backend.repository;

import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.coderacer.backend.model.PasswordResetToken;
import org.coderacer.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, UUID> {

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query(
      """
      select token
      from PasswordResetToken token
      join fetch token.user
      where token.tokenHash = :tokenHash
      """)
  Optional<PasswordResetToken> findByTokenHashForUpdate(@Param("tokenHash") String tokenHash);

  @Modifying
  @Query(
      """
      update PasswordResetToken token
      set token.revokedAt = :revokedAt
      where token.user = :user
        and token.usedAt is null
        and token.revokedAt is null
      """)
  int revokeActiveTokensForUser(@Param("user") User user, @Param("revokedAt") Instant revokedAt);

  @Modifying
  @Query(
      """
      update PasswordResetToken token
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
