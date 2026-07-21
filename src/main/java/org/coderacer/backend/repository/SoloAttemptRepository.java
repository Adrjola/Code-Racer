package org.coderacer.backend.repository;

import java.util.List;
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

  /**
   * Candidate COMPLETED attempts for a difficulty, restricted to enabled, non-deleted users,
   * ordered so the fastest (lowest durationMs) is first; ties break by earliest finishedAt, then
   * lowest user id. The caller passes a single-row Pageable, so only one row ever crosses the wire.
   */
  @EntityGraph(attributePaths = "user")
  @Query(
      """
      select s from SoloAttempt s
      where s.difficulty = :difficulty
        and s.state = org.coderacer.backend.enums.SoloAttemptState.COMPLETED
        and s.user.enabled = true
        and s.user.deleted = false
      order by s.durationMs asc, s.finishedAt asc, s.user.id asc
      """)
  List<SoloAttempt> findFastestCompletedCandidates(
      @Param("difficulty") Difficulty difficulty, Pageable pageable);

  /** Same shape as findFastestCompletedCandidates ordered by highest cpm instead. */
  @EntityGraph(attributePaths = "user")
  @Query(
      """
      select s from SoloAttempt s
      where s.difficulty = :difficulty
        and s.state = org.coderacer.backend.enums.SoloAttemptState.COMPLETED
        and s.user.enabled = true
        and s.user.deleted = false
      order by s.cpm desc, s.finishedAt asc, s.user.id asc
      """)
  List<SoloAttempt> findHighestCpmCompletedCandidates(
      @Param("difficulty") Difficulty difficulty, Pageable pageable);
}
