package org.coderacer.backend.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.UUID;
import org.coderacer.backend.dto.CreateSnippetRequest;
import org.coderacer.backend.dto.SnippetResponse;
import org.coderacer.backend.enums.Difficulty;
import org.coderacer.backend.enums.SnippetLifecycle;
import org.coderacer.backend.exception.ConflictException;
import org.coderacer.backend.exception.ResourceNotFoundException;
import org.coderacer.backend.model.Category;
import org.coderacer.backend.model.CodeSnippet;
import org.coderacer.backend.repository.CategoryRepository;
import org.coderacer.backend.repository.CodeSnippetRepository;
import org.coderacer.backend.service.SnippetService;
import org.coderacer.backend.support.AbstractPostgresIntegrationTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.transaction.annotation.Transactional;

@Transactional
class SnippetIntegrationTest extends AbstractPostgresIntegrationTest {

  @Autowired private SnippetService service;
  @Autowired private CategoryRepository categoryRepository;
  @Autowired private CodeSnippetRepository snippetRepository;

  private Category category;
  private UUID categoryId;

  @BeforeEach
  void setUp() {
    category = new Category();
    category.setName("Java " + UUID.randomUUID());
    category.setDescription("Java exercises");
    categoryId = categoryRepository.saveAndFlush(category).getId();
  }

  @Test
  void createPersistsCanonicalSourceAsActive() {
    SnippetResponse created =
        service.create(
            new CreateSnippetRequest(
                "FizzBuzz", "line1\r\nline2\rline3", Difficulty.EASY, categoryId));

    assertThat(created.id()).isNotNull();
    assertThat(created.lifecycle()).isEqualTo(SnippetLifecycle.ACTIVE);
    assertThat(created.source()).isEqualTo("line1\nline2\nline3");
    assertThat(created.createdAt()).isNotNull();
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
  void deletedSnippetsNeverEnterSelection() {
    SnippetResponse created =
        service.create(new CreateSnippetRequest("A", "aaa", Difficulty.EASY, categoryId));

    service.delete(created.id());

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
  void databaseRejectsDuplicateActiveContentHash() {
    String contentHash = "a".repeat(64);
    CodeSnippet first =
        new CodeSnippet("A", "first source", contentHash, Difficulty.EASY, category);
    CodeSnippet duplicate =
        new CodeSnippet("B", "second source", contentHash, Difficulty.MEDIUM, category);

    snippetRepository.saveAndFlush(first);

    assertThatThrownBy(() -> snippetRepository.saveAndFlush(duplicate))
        .isInstanceOf(DataIntegrityViolationException.class);
  }
}
