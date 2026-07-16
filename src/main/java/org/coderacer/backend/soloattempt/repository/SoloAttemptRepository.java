package org.coderacer.backend.soloattempt.repository;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.coderacer.backend.snippet.model.Difficulty;
import org.coderacer.backend.soloattempt.model.SoloAttempt;
import org.coderacer.backend.soloattempt.model.SoloAttemptState;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SoloAttemptRepository extends JpaRepository<SoloAttempt, UUID> {

  List<SoloAttempt> findByUserId(UUID userId);

  List<SoloAttempt> findByUserIdAndState(UUID userId, SoloAttemptState state);

  List<SoloAttempt> findByUserIdAndStateAndDifficulty(
      UUID userId, SoloAttemptState state, Difficulty difficulty);

  List<SoloAttempt> findByStateIn(List<SoloAttemptState> states);

  @Query(
      value =
          """
          select a from SoloAttempt a
          join fetch a.codeSnippet snippet
          where a.user.id = :userId
            and a.state in :terminalStates
            and (:state is null or a.state = :state)
            and (:categoryId is null or snippet.category.id = :categoryId)
            and (:difficulty is null or a.difficulty = :difficulty)
            and (:startedFrom is null or a.startedAt >= :startedFrom)
            and (:startedTo is null or a.startedAt <= :startedTo)
          """,
      countQuery =
          """
          select count(a) from SoloAttempt a
          where a.user.id = :userId
            and a.state in :terminalStates
            and (:state is null or a.state = :state)
            and (:categoryId is null or a.codeSnippet.category.id = :categoryId)
            and (:difficulty is null or a.difficulty = :difficulty)
            and (:startedFrom is null or a.startedAt >= :startedFrom)
            and (:startedTo is null or a.startedAt <= :startedTo)
          """)
  Page<SoloAttempt> findHistory(
      @Param("userId") UUID userId,
      @Param("terminalStates") Collection<SoloAttemptState> terminalStates,
      @Param("state") SoloAttemptState state,
      @Param("categoryId") UUID categoryId,
      @Param("difficulty") Difficulty difficulty,
      @Param("startedFrom") Instant startedFrom,
      @Param("startedTo") Instant startedTo,
      Pageable pageable);
}
