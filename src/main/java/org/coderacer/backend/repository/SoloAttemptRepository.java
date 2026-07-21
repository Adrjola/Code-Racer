package org.coderacer.backend.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.coderacer.backend.enums.Difficulty;
import org.coderacer.backend.enums.SoloAttemptState;
import org.coderacer.backend.model.SoloAttempt;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SoloAttemptRepository
    extends JpaRepository<SoloAttempt, UUID>, JpaSpecificationExecutor<SoloAttempt> {

  List<SoloAttempt> findByUserId(UUID userId);

  List<SoloAttempt> findByUserIdAndState(UUID userId, SoloAttemptState state);

  List<SoloAttempt> findByUserIdAndStateAndDifficulty(
      UUID userId, SoloAttemptState state, Difficulty difficulty);

  List<SoloAttempt> findByStateIn(List<SoloAttemptState> states);

  /**
   * Aggregates the caller's completed attempts into one row per difficulty. Grouping and averaging
   * happen in PostgreSQL, so only the small result set crosses the wire. Difficulties with no
   * completed attempts simply do not appear; the service fills those gaps.
   */
  @Query(
      """
      select s.difficulty as difficulty,
             min(s.durationMs) as fastestDurationMs,
             max(s.cpm) as highestCpm,
             avg(s.durationMs) as averageDurationMs,
             avg(s.cpm) as averageCpm
      from SoloAttempt s
      where s.user.id = :userId and s.state = org.coderacer.backend.enums.SoloAttemptState.COMPLETED
      group by s.difficulty
      """)
  List<DifficultyStatsProjection> aggregateCompletedByDifficulty(@Param("userId") UUID userId);

  @Override
  @EntityGraph(attributePaths = "codeSnippet")
  Page<SoloAttempt> findAll(Specification<SoloAttempt> specification, Pageable pageable);

  // Finds fastest user by duration filtered by difficulty and attempt state. The underscores
  // force explicit traversal into the "user" association instead of relying on Spring Data's
  // greedy property-name matching to figure out where "user" ends and "enabled"/"deleted"/"id"
  // begin.
  @EntityGraph(attributePaths = "user")
  Optional<SoloAttempt>
      findFirstByDifficultyAndStateAndUser_EnabledTrueAndUser_DeletedFalseOrderByDurationMsAscFinishedAtAscUser_IdAsc(
          Difficulty difficulty, SoloAttemptState state);

  // Finds fastest user by cpm filtered by difficulty and attempt state
  @EntityGraph(attributePaths = "user")
  Optional<SoloAttempt>
      findFirstByDifficultyAndStateAndUser_EnabledTrueAndUser_DeletedFalseOrderByCpmDescFinishedAtAscUser_IdAsc(
          Difficulty difficulty, SoloAttemptState state);
}
