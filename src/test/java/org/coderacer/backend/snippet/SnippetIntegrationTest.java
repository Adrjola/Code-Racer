package org.coderacer.backend.snippet;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.UUID;
import org.coderacer.backend.AbstractPostgresIntegrationTest;
import org.coderacer.backend.category.model.Category;
import org.coderacer.backend.category.repository.CategoryRepository;
import org.coderacer.backend.common.exception.ConflictException;
import org.coderacer.backend.common.exception.ResourceNotFoundException;
import org.coderacer.backend.snippet.dto.CreateSnippetRequest;
import org.coderacer.backend.snippet.dto.SnippetResponse;
import org.coderacer.backend.snippet.dto.UpdateSnippetRequest;
import org.coderacer.backend.snippet.model.Difficulty;
import org.coderacer.backend.snippet.model.SnippetLifecycle;
import org.coderacer.backend.snippet.service.SnippetService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;

@Transactional
class SnippetIntegrationTest extends AbstractPostgresIntegrationTest {

  @Autowired private SnippetService service;
  @Autowired private CategoryRepository categoryRepository;

  private UUID categoryId;

  @BeforeEach
  void setUp() {
    Category category = new Category();
    category.setName("Java " + UUID.randomUUID());
    category.setDescription("Java exercises");
    categoryId = categoryRepository.saveAndFlush(category).getId();
  }

  @Test
  void createPersistsCanonicalSourceAsTheFirstActiveRevision() {
    SnippetResponse created =
        service.create(
            new CreateSnippetRequest(
                "FizzBuzz", "line1\r\nline2\rline3", Difficulty.EASY, categoryId));

    assertThat(created.id()).isNotNull();
    assertThat(created.snippetId()).isNotNull();
    assertThat(created.revisionNumber()).isEqualTo(1);
    assertThat(created.lifecycle()).isEqualTo(SnippetLifecycle.ACTIVE);
    assertThat(created.source()).isEqualTo("line1\nline2\nline3");
    assertThat(created.createdAt()).isNotNull();
  }

  @Test
  void gameplayEditCreatesANewRevisionWhileTheOldOneKeepsItsExactSource() {
    SnippetResponse first =
        service.create(
            new CreateSnippetRequest("FizzBuzz", "old source", Difficulty.EASY, categoryId));

    SnippetResponse second =
        service.update(
            first.id(),
            new UpdateSnippetRequest(
                "FizzBuzz", "new source", Difficulty.EASY, categoryId, first.version()));

    assertThat(second.id()).isNotEqualTo(first.id());
    assertThat(second.snippetId()).isEqualTo(first.snippetId());
    assertThat(second.revisionNumber()).isEqualTo(2);
    assertThat(second.source()).isEqualTo("new source");

    SnippetResponse original = service.getById(first.id());
    assertThat(original.lifecycle()).isEqualTo(SnippetLifecycle.RETIRED);
    assertThat(original.source()).isEqualTo("old source");
    assertThat(original.difficulty()).isEqualTo(Difficulty.EASY);
  }

  @Test
  void aTitleOnlyEditDoesNotCreateANewRevision() {
    SnippetResponse first =
        service.create(
            new CreateSnippetRequest("Old title", "source", Difficulty.EASY, categoryId));

    SnippetResponse updated =
        service.update(
            first.id(),
            new UpdateSnippetRequest(
                "New title", "source", Difficulty.EASY, categoryId, first.version()));

    assertThat(updated.id()).isEqualTo(first.id());
    assertThat(updated.revisionNumber()).isEqualTo(1);
    assertThat(updated.title()).isEqualTo("New title");
    assertThat(updated.lifecycle()).isEqualTo(SnippetLifecycle.ACTIVE);
  }

  @Test
  void refreshExcludesTheContentThePlayerAlreadyHas() {
    SnippetResponse first =
        service.create(new CreateSnippetRequest("A", "aaa", Difficulty.EASY, categoryId));
    SnippetResponse other =
        service.create(new CreateSnippetRequest("B", "bbb", Difficulty.EASY, categoryId));

    SnippetResponse refreshed = service.randomEligible(categoryId, Difficulty.EASY, first.id());

    assertThat(refreshed.id()).isEqualTo(other.id());
  }

  @Test
  void nonActiveRevisionsNeverEnterSelection() {
    SnippetResponse created =
        service.create(new CreateSnippetRequest("A", "aaa", Difficulty.EASY, categoryId));

    service.deactivate(created.id());

    assertThatThrownBy(() -> service.randomEligible(categoryId, Difficulty.EASY, null))
        .isInstanceOf(ResourceNotFoundException.class);
  }

  @Test
  void duplicateActiveContentIsRejected() {
    service.create(new CreateSnippetRequest("A", "same source", Difficulty.EASY, categoryId));

    assertThatThrownBy(
            () ->
                service.create(
                    new CreateSnippetRequest("B", "same source", Difficulty.MEDIUM, categoryId)))
        .isInstanceOf(ConflictException.class);
  }

  @Test
  void aStaleVersionIsRejectedInsteadOfOverwriting() {
    SnippetResponse first =
        service.create(new CreateSnippetRequest("A", "aaa", Difficulty.EASY, categoryId));

    assertThatThrownBy(
            () ->
                service.update(
                    first.id(),
                    new UpdateSnippetRequest("B", "bbb", Difficulty.EASY, categoryId, 99L)))
        .isInstanceOf(ConflictException.class);
  }
}
