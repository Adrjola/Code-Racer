package org.coderacer.backend.soloattempt.repository;

import java.util.List;
import java.util.UUID;
import org.coderacer.backend.soloattempt.model.Difficulty;
import org.coderacer.backend.soloattempt.model.SoloAttempt;
import org.coderacer.backend.soloattempt.model.SoloAttemptState;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SoloAttemptRepository extends JpaRepository<SoloAttempt, UUID> {

  List<SoloAttempt> findByUserId(UUID userId);

  List<SoloAttempt> findByUserIdAndState(UUID userId, SoloAttemptState state);

  List<SoloAttempt> findByUserIdAndStateAndDifficulty(
      UUID userId, SoloAttemptState state, Difficulty difficulty);

  List<SoloAttempt> findByStateIn(List<SoloAttemptState> states);
}
