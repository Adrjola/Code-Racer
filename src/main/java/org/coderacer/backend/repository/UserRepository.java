package org.coderacer.backend.repository;

import java.util.UUID;
import org.coderacer.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, UUID> {}
