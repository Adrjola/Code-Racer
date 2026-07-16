package org.coderacer.backend.repository;

import java.util.List;
import java.util.UUID;
import org.coderacer.backend.model.Difficulty;
import org.coderacer.backend.model.SoloAttempt;
import org.coderacer.backend.model.SoloAttemptState;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SoloAttemptRepository extends JpaRepository<SoloAttempt, UUID> {

  List<SoloAttempt> findByUserId(UUID userId);

  List<SoloAttempt> findByUserIdAndState(UUID userId, SoloAttemptState state);

  List<SoloAttempt> findByUserIdAndStateAndDifficulty(
      UUID userId, SoloAttemptState state, Difficulty difficulty);

  List<SoloAttempt> findByStateIn(List<SoloAttemptState> states);
}
