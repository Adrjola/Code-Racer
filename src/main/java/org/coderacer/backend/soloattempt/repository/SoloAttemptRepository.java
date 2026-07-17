package org.coderacer.backend.soloattempt.repository;

import java.util.List;
import java.util.UUID;
import org.coderacer.backend.snippet.model.Difficulty;
import org.coderacer.backend.soloattempt.model.SoloAttempt;
import org.coderacer.backend.soloattempt.model.SoloAttemptState;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface SoloAttemptRepository
    extends JpaRepository<SoloAttempt, UUID>, JpaSpecificationExecutor<SoloAttempt> {

  List<SoloAttempt> findByUserId(UUID userId);

  List<SoloAttempt> findByUserIdAndState(UUID userId, SoloAttemptState state);

  List<SoloAttempt> findByUserIdAndStateAndDifficulty(
      UUID userId, SoloAttemptState state, Difficulty difficulty);

  List<SoloAttempt> findByStateIn(List<SoloAttemptState> states);

  @Override
  @EntityGraph(attributePaths = "codeSnippet")
  Page<SoloAttempt> findAll(Specification<SoloAttempt> specification, Pageable pageable);
}
