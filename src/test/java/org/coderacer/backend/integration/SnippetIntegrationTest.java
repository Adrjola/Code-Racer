package org.coderacer.backend.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.coderacer.backend.dto.CreateSnippetRequest;
import org.coderacer.backend.dto.SnippetResponse;
import org.coderacer.backend.enums.Category;
import org.coderacer.backend.enums.Difficulty;
import org.coderacer.backend.enums.SnippetLifecycle;
import org.coderacer.backend.exception.ConflictException;
import org.coderacer.backend.exception.ResourceNotFoundException;
import org.coderacer.backend.model.CodeSnippet;
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
  @Autowired private CodeSnippetRepository snippetRepository;

  // The seeded catalog shares the JAVA category with everything these tests
  // create, so it has to be cleared or it turns up in random selection.
  @BeforeEach
  void clearSeededSnippets() {
    snippetRepository.deleteAll();
  }

  @Test
  void createPersistsCanonicalSourceAsActive() {
    SnippetResponse created =
        service.create(
            new CreateSnippetRequest(
                "FizzBuzz", "line1\r\nline2\rline3", Difficulty.EASY, Category.JAVA));

    assertThat(created.id()).isNotNull();
    assertThat(created.lifecycle()).isEqualTo(SnippetLifecycle.ACTIVE);
    assertThat(created.source()).isEqualTo("line1\nline2\nline3");
    assertThat(created.createdAt()).isNotNull();
  }

  @Test
  void refreshExcludesTheContentThePlayerAlreadyHas() {
    SnippetResponse first =
        service.create(new CreateSnippetRequest("A", "aaa", Difficulty.EASY, Category.JAVA));
    SnippetResponse other =
        service.create(new CreateSnippetRequest("B", "bbb", Difficulty.EASY, Category.JAVA));

    SnippetResponse refreshed = service.randomEligible(Category.JAVA, Difficulty.EASY, first.id());

    assertThat(refreshed.id()).isEqualTo(other.id());
  }

  @Test
  void deletedSnippetsNeverEnterSelection() {
    SnippetResponse created =
        service.create(new CreateSnippetRequest("A", "aaa", Difficulty.EASY, Category.JAVA));

    service.delete(created.id());

    assertThatThrownBy(() -> service.randomEligible(Category.JAVA, Difficulty.EASY, null))
        .isInstanceOf(ResourceNotFoundException.class);
  }

  @Test
  void duplicateActiveContentIsRejected() {
    service.create(new CreateSnippetRequest("A", "same source", Difficulty.EASY, Category.JAVA));

    assertThatThrownBy(
            () ->
                service.create(
                    new CreateSnippetRequest("B", "same source", Difficulty.MEDIUM, Category.JAVA)))
        .isInstanceOf(ConflictException.class);
  }

  @Test
  void databaseRejectsDuplicateActiveContentHash() {
    String contentHash = "a".repeat(64);
    CodeSnippet first =
        new CodeSnippet("A", "first source", contentHash, Difficulty.EASY, Category.JAVA);
    CodeSnippet duplicate =
        new CodeSnippet("B", "second source", contentHash, Difficulty.MEDIUM, Category.JAVA);

    snippetRepository.saveAndFlush(first);

    assertThatThrownBy(() -> snippetRepository.saveAndFlush(duplicate))
        .isInstanceOf(DataIntegrityViolationException.class);
  }
}
