package org.coderacer.backend.user.repository;

import java.util.Optional;
import java.util.UUID;
import org.coderacer.backend.user.model.User;
import org.coderacer.backend.user.model.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, UUID> {

  boolean existsByEmail(String email);

  boolean existsByUsername(String username);

  boolean existsByRole(UserRole role);

  Optional<User> findByEmail(String email);

  Optional<User> findByEmailOrUsername(String email, String username);

  Optional<User> findByUsername(String username);
}
