package org.coderacer.backend.repository;

import java.util.UUID;
import org.coderacer.backend.model.Category;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CategoryRepository extends JpaRepository<Category, UUID> {

  boolean existsByName(String name);

  boolean existsByNameAndIdNot(String name, UUID id);

  Page<Category> findByActiveTrue(Pageable pageable);
}
