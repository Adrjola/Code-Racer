package org.coderacer.backend.repository;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.UUID;
import org.coderacer.backend.enums.UserRole;
import org.coderacer.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserRepository extends JpaRepository<User, UUID>, JpaSpecificationExecutor<User> {

  boolean existsByEmail(String email);

  boolean existsByUsernameNormalized(String usernameNormalized);

  boolean existsByRole(UserRole role);

  Optional<User> findByEmail(String email);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select u from User u where u.email = :email")
  Optional<User> findByEmailForUpdate(@Param("email") String email);

  Optional<User> findByEmailOrUsernameNormalized(String email, String usernameNormalized);

  Optional<User> findByUsername(String username);
}
