package org.coderacer.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;
import java.util.UUID;
import org.coderacer.backend.dto.CreateSnippetRequest;
import org.coderacer.backend.dto.SnippetResponse;
import org.coderacer.backend.enums.Difficulty;
import org.coderacer.backend.enums.SnippetLifecycle;
import org.coderacer.backend.exception.ConflictException;
import org.coderacer.backend.exception.ResourceNotFoundException;
import org.coderacer.backend.exception.ValidationException;
import org.coderacer.backend.mapper.SnippetMapper;
import org.coderacer.backend.model.Category;
import org.coderacer.backend.model.CodeSnippet;
import org.coderacer.backend.repository.CategoryRepository;
import org.coderacer.backend.repository.CodeSnippetRepository;
import org.coderacer.backend.util.Sha256Hasher;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class SnippetServiceTest {

  @Mock private CodeSnippetRepository repository;
  @Mock private CategoryRepository categoryRepository;
  @Mock private SnippetMapper mapper;
  @InjectMocks private SnippetService service;

  private final UUID revisionId = UUID.randomUUID();
  private final UUID categoryId = UUID.randomUUID();
  private Category category;

  @BeforeEach
  void setUp() {
    category = new Category();
    category.setId(categoryId);
    category.setName("Java");
    category.setActive(true);
  }

  @Test
  void create_canonicalizesLineEndingsBeforeStoring() {
    givenCategoryIsAvailable();
    givenContentIsNotDuplicated();
    when(repository.saveAndFlush(any(CodeSnippet.class))).thenAnswer(inv -> inv.getArgument(0));

    service.create(new CreateSnippetRequest("Title", "a\r\nb\rc\nd", Difficulty.EASY, categoryId));

    assertThat(savedSnippet().getSource()).isEqualTo("a\nb\nc\nd");
  }

  @Test
  void create_storesSnippetAsActive() {
    givenCategoryIsAvailable();
    givenContentIsNotDuplicated();
    when(repository.saveAndFlush(any(CodeSnippet.class))).thenAnswer(inv -> inv.getArgument(0));

    service.create(new CreateSnippetRequest("Title", "code", Difficulty.HARD, categoryId));

    CodeSnippet saved = savedSnippet();
    assertThat(saved.getLifecycle()).isEqualTo(SnippetLifecycle.ACTIVE);
    assertThat(saved.getContentHash()).isEqualTo(sha256Hex("code"));
  }

  @Test
  void create_measuresTitleInCodePointsNotUtf16Units() {
    givenCategoryIsAvailable();
    givenContentIsNotDuplicated();
    when(repository.saveAndFlush(any(CodeSnippet.class))).thenAnswer(inv -> inv.getArgument(0));

    String title = new String(Character.toChars(0x1D11E)).repeat(150);
    assertThat(title.codePointCount(0, title.length())).isEqualTo(150);
    assertThat(title.length()).isEqualTo(300);

    service.create(new CreateSnippetRequest(title, "code", Difficulty.EASY, categoryId));

    assertThat(savedSnippet().getTitle()).isEqualTo(title);
  }

  @Test
  void create_rejectsTitleLongerThanTheCodePointLimit() {
    assertThatThrownBy(
            () ->
                service.create(
                    new CreateSnippetRequest("a".repeat(201), "code", Difficulty.EASY, categoryId)))
        .isInstanceOf(ValidationException.class);
    verify(repository, never()).saveAndFlush(any());
  }

  @Test
  void create_rejectsSourceLongerThanTheCodePointLimit() {
    assertThatThrownBy(
            () ->
                service.create(
                    new CreateSnippetRequest(
                        "Title", "a".repeat(10001), Difficulty.EASY, categoryId)))
        .isInstanceOf(ValidationException.class);
  }

  @Test
  void create_rejectsContentThatDuplicatesAnActiveSnippet() {
    when(repository.existsByContentHashAndLifecycle(any(), eq(SnippetLifecycle.ACTIVE)))
        .thenReturn(true);

    assertThatThrownBy(
            () ->
                service.create(
                    new CreateSnippetRequest("Title", "code", Difficulty.EASY, categoryId)))
        .isInstanceOf(ConflictException.class);
  }

  @Test
  void create_mapsDatabaseDuplicateRaceToConflict() {
    givenCategoryIsAvailable();
    givenContentIsNotDuplicated();
    when(repository.saveAndFlush(any(CodeSnippet.class)))
        .thenThrow(new DataIntegrityViolationException("uq_code_snippet_active_content_hash"));

    assertThatThrownBy(
            () ->
                service.create(
                    new CreateSnippetRequest("Title", "code", Difficulty.EASY, categoryId)))
        .isInstanceOf(ConflictException.class);
  }

  @Test
  void create_rejectsUnknownCategory() {
    givenContentIsNotDuplicated();
    when(categoryRepository.findById(categoryId)).thenReturn(Optional.empty());

    assertThatThrownBy(
            () ->
                service.create(
                    new CreateSnippetRequest("Title", "code", Difficulty.EASY, categoryId)))
        .isInstanceOf(ResourceNotFoundException.class);
  }

  @Test
  void create_rejectsInactiveCategory() {
    category.setActive(false);
    givenContentIsNotDuplicated();
    when(categoryRepository.findById(categoryId)).thenReturn(Optional.of(category));

    assertThatThrownBy(
            () ->
                service.create(
                    new CreateSnippetRequest("Title", "code", Difficulty.EASY, categoryId)))
        .isInstanceOf(ConflictException.class);
  }

  @Test
  void delete_softDeletesTheRevision() {
    CodeSnippet existing = existingSnippet("code", Difficulty.EASY, SnippetLifecycle.ACTIVE);
    when(repository.findById(revisionId)).thenReturn(Optional.of(existing));

    service.delete(revisionId);

    assertThat(existing.getLifecycle()).isEqualTo(SnippetLifecycle.DELETED);
    verify(repository).save(existing);
  }

  @Test
  void delete_rejectsAnAlreadyDeletedRevision() {
    CodeSnippet existing = existingSnippet("code", Difficulty.EASY, SnippetLifecycle.DELETED);
    when(repository.findById(revisionId)).thenReturn(Optional.of(existing));

    assertThatThrownBy(() -> service.delete(revisionId)).isInstanceOf(ConflictException.class);
  }

  @Test
  void randomEligible_excludesTheContentThePlayerAlreadyHas() {
    CodeSnippet current = existingSnippet("code", Difficulty.EASY, SnippetLifecycle.ACTIVE);
    when(repository.findById(revisionId)).thenReturn(Optional.of(current));
    when(repository.findFirstEligibleAtOrAfter(
            eq(categoryId), eq("EASY"), eq(current.getContentHash()), anyDouble()))
        .thenReturn(Optional.of(current));
    when(mapper.toResponse(current)).thenReturn(response(current));

    service.randomEligible(categoryId, Difficulty.EASY, revisionId);

    verify(repository)
        .findFirstEligibleAtOrAfter(
            eq(categoryId), eq("EASY"), eq(current.getContentHash()), anyDouble());
  }

  @Test
  void randomEligible_wrapsToTheBeginningWhenNoLaterRevisionExists() {
    CodeSnippet current = existingSnippet("code", Difficulty.EASY, SnippetLifecycle.ACTIVE);
    when(repository.findFirstEligibleAtOrAfter(eq(null), eq(null), eq(null), anyDouble()))
        .thenReturn(Optional.empty());
    when(repository.findFirstEligibleBefore(eq(null), eq(null), eq(null), anyDouble()))
        .thenReturn(Optional.of(current));
    when(mapper.toResponse(current)).thenReturn(response(current));

    service.randomEligible(null, null, null);

    verify(repository).findFirstEligibleBefore(eq(null), eq(null), eq(null), anyDouble());
  }

  @Test
  void randomEligible_failsWhenNoRevisionIsEligible() {
    when(repository.findFirstEligibleAtOrAfter(eq(null), eq(null), eq(null), anyDouble()))
        .thenReturn(Optional.empty());
    when(repository.findFirstEligibleBefore(eq(null), eq(null), eq(null), anyDouble()))
        .thenReturn(Optional.empty());

    assertThatThrownBy(() -> service.randomEligible(null, null, null))
        .isInstanceOf(ResourceNotFoundException.class);
  }

  private void givenCategoryIsAvailable() {
    when(categoryRepository.findById(categoryId)).thenReturn(Optional.of(category));
  }

  private void givenContentIsNotDuplicated() {
    when(repository.existsByContentHashAndLifecycle(any(), eq(SnippetLifecycle.ACTIVE)))
        .thenReturn(false);
  }

  private CodeSnippet savedSnippet() {
    ArgumentCaptor<CodeSnippet> captor = ArgumentCaptor.forClass(CodeSnippet.class);
    verify(repository).saveAndFlush(captor.capture());
    return captor.getValue();
  }

  private CodeSnippet lastSavedSnippet() {
    ArgumentCaptor<CodeSnippet> captor = ArgumentCaptor.forClass(CodeSnippet.class);
    verify(repository, times(2)).saveAndFlush(captor.capture());
    return captor.getAllValues().get(1);
  }

  private CodeSnippet existingSnippet(
      String source, Difficulty difficulty, SnippetLifecycle lifecycle) {
    CodeSnippet snippet = new CodeSnippet("Title", source, sha256Hex(source), difficulty, category);
    if (lifecycle == SnippetLifecycle.DELETED) {
      snippet.softDelete();
    }
    ReflectionTestUtils.setField(snippet, "id", revisionId);
    return snippet;
  }

  private SnippetResponse response(CodeSnippet snippet) {
    return new SnippetResponse(
        snippet.getId(),
        snippet.getTitle(),
        snippet.getSource(),
        snippet.getDifficulty(),
        snippet.getLifecycle(),
        categoryId,
        null,
        null);
  }

  private static String sha256Hex(String value) {
    return Sha256Hasher.hashHex(value);
  }
}
