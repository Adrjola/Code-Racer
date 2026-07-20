package org.coderacer.backend.repository;

import java.util.Optional;
import java.util.UUID;
import org.coderacer.backend.enums.Difficulty;
import org.coderacer.backend.enums.SnippetLifecycle;
import org.coderacer.backend.model.CodeSnippet;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CodeSnippetRepository extends JpaRepository<CodeSnippet, UUID> {

  boolean existsByContentHashAndLifecycle(String contentHash, SnippetLifecycle lifecycle);

  boolean existsByContentHashAndLifecycleAndIdNot(
      String contentHash, SnippetLifecycle lifecycle, UUID id);

  Optional<CodeSnippet> findFirstBySnippetIdOrderByRevisionNumberDesc(UUID snippetId);

  @Query(
      """
      select s from CodeSnippet s
      where (:categoryId is null or s.category.id = :categoryId)
        and (:difficulty is null or s.difficulty = :difficulty)
        and (:lifecycle is null or s.lifecycle = :lifecycle)
      """)
  Page<CodeSnippet> search(
      @Param("categoryId") UUID categoryId,
      @Param("difficulty") Difficulty difficulty,
      @Param("lifecycle") SnippetLifecycle lifecycle,
      Pageable pageable);

  @Query(
      value =
          """
          select *
          from code_snippet
          where lifecycle = 'ACTIVE'
            and (cast(:categoryId as uuid) is null or category_id = cast(:categoryId as uuid))
            and (cast(:difficulty as varchar) is null or difficulty = cast(:difficulty as varchar))
            and (cast(:excludeContentHash as varchar) is null
                 or content_hash <> cast(:excludeContentHash as varchar))
            and selection_key >= :selectionKey
          order by selection_key
          limit 1
          """,
      nativeQuery = true)
  Optional<CodeSnippet> findFirstEligibleAtOrAfter(
      @Param("categoryId") UUID categoryId,
      @Param("difficulty") String difficulty,
      @Param("excludeContentHash") String excludeContentHash,
      @Param("selectionKey") double selectionKey);

  @Query(
      value =
          """
          select *
          from code_snippet
          where lifecycle = 'ACTIVE'
            and (cast(:categoryId as uuid) is null or category_id = cast(:categoryId as uuid))
            and (cast(:difficulty as varchar) is null or difficulty = cast(:difficulty as varchar))
            and (cast(:excludeContentHash as varchar) is null
                 or content_hash <> cast(:excludeContentHash as varchar))
            and selection_key < :selectionKey
          order by selection_key
          limit 1
          """,
      nativeQuery = true)
  Optional<CodeSnippet> findFirstEligibleBefore(
      @Param("categoryId") UUID categoryId,
      @Param("difficulty") String difficulty,
      @Param("excludeContentHash") String excludeContentHash,
      @Param("selectionKey") double selectionKey);
}
