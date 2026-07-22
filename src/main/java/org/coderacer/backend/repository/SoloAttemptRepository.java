package org.coderacer.backend.repository;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.coderacer.backend.enums.Difficulty;
import org.coderacer.backend.enums.SnippetLifecycle;
import org.coderacer.backend.enums.SoloAttemptState;
import org.coderacer.backend.model.SoloAttempt;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SoloAttemptRepository
    extends JpaRepository<SoloAttempt, UUID>, JpaSpecificationExecutor<SoloAttempt> {

  List<SoloAttempt> findByUserId(UUID userId);

  List<SoloAttempt> findByUserIdAndState(UUID userId, SoloAttemptState state);

  List<SoloAttempt> findByUserIdAndStateAndDifficulty(
      UUID userId, SoloAttemptState state, Difficulty difficulty);

  List<SoloAttempt> findByStateIn(List<SoloAttemptState> states);

  /** The single live attempt the one-active-attempt index allows a user to have. */
  Optional<SoloAttempt> findFirstByUserIdAndStateIn(UUID userId, List<SoloAttemptState> states);

  /**
   * Locks one attempt row for the caller's transaction. Live progress updates read, check and write
   * the same row, so they have to be serialised the way the in-memory map used to serialise them.
   */
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  Optional<SoloAttempt> findWithLockById(UUID id);

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
      where s.user.id = :userId
        and s.state = org.coderacer.backend.enums.SoloAttemptState.COMPLETED
        and s.codeSnippet.lifecycle <> org.coderacer.backend.enums.SnippetLifecycle.DELETED
      group by s.difficulty
      """)
  List<DifficultyStatsProjection> aggregateCompletedByDifficulty(@Param("userId") UUID userId);

  /** Every scoring run on one snippet, which is the whole leaderboard for it. */
  @EntityGraph(attributePaths = "user")
  List<SoloAttempt> findByCodeSnippetIdAndStateAndUserDeletedFalse(
      UUID codeSnippetId, SoloAttemptState state);

  @Override
  @EntityGraph(attributePaths = "codeSnippet")
  Page<SoloAttempt> findAll(Specification<SoloAttempt> specification, Pageable pageable);

  /**
   * The single COMPLETED attempt with the lowest durationMs for a difficulty, restricted to
   * non-deleted users. Ties break by earliest finishedAt, then lowest user id, both encoded
   * directly in the method name's ORDER BY.
   */
  @EntityGraph(attributePaths = "user")
  Optional<SoloAttempt>
      findFirstByDifficultyAndStateAndUserDeletedFalseOrderByDurationMsAscFinishedAtAscUserIdAsc(
          Difficulty difficulty, SoloAttemptState state);

  /** Same shape as above, highest cpm instead of lowest durationMs. */
  @EntityGraph(attributePaths = "user")
  Optional<SoloAttempt>
      findFirstByDifficultyAndStateAndUserDeletedFalseOrderByCpmDescFinishedAtAscUserIdAsc(
          Difficulty difficulty, SoloAttemptState state);

  /**
   * Every completed attempt of one user across all difficulties. No entity graph is needed here:
   * codeSnippet is EAGER on SoloAttempt, and its category is a plain enum column, not a lazy
   * association.
   */
  List<SoloAttempt> findByUserIdAndStateAndCodeSnippetLifecycleNot(
      UUID userId, SoloAttemptState state, SnippetLifecycle lifecycle);
}
