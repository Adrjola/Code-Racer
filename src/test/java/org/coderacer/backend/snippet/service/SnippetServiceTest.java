package org.coderacer.backend.snippet.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Optional;
import java.util.UUID;
import org.coderacer.backend.category.model.Category;
import org.coderacer.backend.category.repository.CategoryRepository;
import org.coderacer.backend.common.exception.ConflictException;
import org.coderacer.backend.common.exception.ResourceNotFoundException;
import org.coderacer.backend.common.exception.ValidationException;
import org.coderacer.backend.snippet.dto.CreateSnippetRequest;
import org.coderacer.backend.snippet.dto.SnippetResponse;
import org.coderacer.backend.snippet.dto.UpdateSnippetRequest;
import org.coderacer.backend.snippet.mapper.SnippetMapper;
import org.coderacer.backend.snippet.model.CodeSnippet;
import org.coderacer.backend.snippet.model.Difficulty;
import org.coderacer.backend.snippet.model.SnippetLifecycle;
import org.coderacer.backend.snippet.repository.CodeSnippetRepository;
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
  void create_storesFirstRevisionAsActive() {
    givenCategoryIsAvailable();
    givenContentIsNotDuplicated();
    when(repository.saveAndFlush(any(CodeSnippet.class))).thenAnswer(inv -> inv.getArgument(0));

    service.create(new CreateSnippetRequest("Title", "code", Difficulty.HARD, categoryId));

    CodeSnippet saved = savedSnippet();
    assertThat(saved.getRevisionNumber()).isEqualTo(1);
    assertThat(saved.getSnippetId()).isNotNull();
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
  void update_withOnlyATitleChangeKeepsTheSameRevision() {
    CodeSnippet existing = existingRevision("code", Difficulty.EASY, SnippetLifecycle.ACTIVE);
    when(repository.findById(revisionId)).thenReturn(Optional.of(existing));
    givenCategoryIsAvailable();
    when(repository.saveAndFlush(existing)).thenReturn(existing);

    service.update(
        revisionId, new UpdateSnippetRequest("New title", "code", Difficulty.EASY, categoryId, 0L));

    assertThat(existing.getTitle()).isEqualTo("New title");
    assertThat(existing.getLifecycle()).isEqualTo(SnippetLifecycle.ACTIVE);
    verify(repository, never()).save(any());
  }

  @Test
  void update_withAGameplayChangeRetiresOldRevisionAndCreatesTheNextOne() {
    CodeSnippet existing = existingRevision("old code", Difficulty.EASY, SnippetLifecycle.ACTIVE);
    when(repository.findById(revisionId)).thenReturn(Optional.of(existing));
    givenCategoryIsAvailable();
    givenContentIsNotDuplicatedExceptCurrentRevision();
    when(repository.findFirstBySnippetIdOrderByRevisionNumberDesc(existing.getSnippetId()))
        .thenReturn(Optional.of(existing));
    when(repository.saveAndFlush(any(CodeSnippet.class))).thenAnswer(inv -> inv.getArgument(0));

    service.update(
        revisionId, new UpdateSnippetRequest("Title", "new code", Difficulty.EASY, categoryId, 0L));

    assertThat(existing.getLifecycle()).isEqualTo(SnippetLifecycle.RETIRED);
    CodeSnippet revision = lastSavedSnippet();
    assertThat(revision.getSnippetId()).isEqualTo(existing.getSnippetId());
    assertThat(revision.getRevisionNumber()).isEqualTo(2);
    assertThat(revision.getLifecycle()).isEqualTo(SnippetLifecycle.ACTIVE);
    assertThat(revision.getSource()).isEqualTo("new code");
  }

  @Test
  void update_rejectsAStaleVersion() {
    CodeSnippet existing = existingRevision("code", Difficulty.EASY, SnippetLifecycle.ACTIVE);
    ReflectionTestUtils.setField(existing, "version", 3L);
    when(repository.findById(revisionId)).thenReturn(Optional.of(existing));

    assertThatThrownBy(
            () ->
                service.update(
                    revisionId,
                    new UpdateSnippetRequest("Title", "code", Difficulty.EASY, categoryId, 2L)))
        .isInstanceOf(ConflictException.class);
    verify(repository, never()).saveAndFlush(any());
  }

  @Test
  void update_rejectsARetiredRevision() {
    CodeSnippet existing = existingRevision("code", Difficulty.EASY, SnippetLifecycle.RETIRED);
    when(repository.findById(revisionId)).thenReturn(Optional.of(existing));

    assertThatThrownBy(
            () ->
                service.update(
                    revisionId,
                    new UpdateSnippetRequest("Title", "code", Difficulty.EASY, categoryId, 0L)))
        .isInstanceOf(ConflictException.class);
  }

  @Test
  void activate_movesAnInactiveRevisionToActive() {
    CodeSnippet existing = existingRevision("code", Difficulty.EASY, SnippetLifecycle.INACTIVE);
    when(repository.findById(revisionId)).thenReturn(Optional.of(existing));
    when(repository.saveAndFlush(existing)).thenReturn(existing);

    service.activate(revisionId);

    assertThat(existing.getLifecycle()).isEqualTo(SnippetLifecycle.ACTIVE);
  }

  @Test
  void activate_rejectsARevisionThatIsNotInactive() {
    CodeSnippet existing = existingRevision("code", Difficulty.EASY, SnippetLifecycle.RETIRED);
    when(repository.findById(revisionId)).thenReturn(Optional.of(existing));

    assertThatThrownBy(() -> service.activate(revisionId)).isInstanceOf(ConflictException.class);
  }

  @Test
  void deactivate_movesAnActiveRevisionToInactive() {
    CodeSnippet existing = existingRevision("code", Difficulty.EASY, SnippetLifecycle.ACTIVE);
    when(repository.findById(revisionId)).thenReturn(Optional.of(existing));
    when(repository.saveAndFlush(existing)).thenReturn(existing);

    service.deactivate(revisionId);

    assertThat(existing.getLifecycle()).isEqualTo(SnippetLifecycle.INACTIVE);
  }

  @Test
  void delete_softDeletesTheRevision() {
    CodeSnippet existing = existingRevision("code", Difficulty.EASY, SnippetLifecycle.ACTIVE);
    when(repository.findById(revisionId)).thenReturn(Optional.of(existing));

    service.delete(revisionId);

    assertThat(existing.getLifecycle()).isEqualTo(SnippetLifecycle.DELETED);
    verify(repository).save(existing);
  }

  @Test
  void delete_rejectsAnAlreadyDeletedRevision() {
    CodeSnippet existing = existingRevision("code", Difficulty.EASY, SnippetLifecycle.DELETED);
    when(repository.findById(revisionId)).thenReturn(Optional.of(existing));

    assertThatThrownBy(() -> service.delete(revisionId)).isInstanceOf(ConflictException.class);
  }

  @Test
  void restore_movesADeletedRevisionToInactive() {
    CodeSnippet existing = existingRevision("code", Difficulty.EASY, SnippetLifecycle.DELETED);
    when(repository.findById(revisionId)).thenReturn(Optional.of(existing));
    when(repository.saveAndFlush(existing)).thenReturn(existing);

    service.restore(revisionId);

    assertThat(existing.getLifecycle()).isEqualTo(SnippetLifecycle.INACTIVE);
  }

  @Test
  void randomEligible_excludesTheContentThePlayerAlreadyHas() {
    CodeSnippet current = existingRevision("code", Difficulty.EASY, SnippetLifecycle.ACTIVE);
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
    CodeSnippet current = existingRevision("code", Difficulty.EASY, SnippetLifecycle.ACTIVE);
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

  private void givenContentIsNotDuplicatedExceptCurrentRevision() {
    when(repository.existsByContentHashAndLifecycleAndIdNot(
            any(), eq(SnippetLifecycle.ACTIVE), eq(revisionId)))
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

  private CodeSnippet existingRevision(
      String source, Difficulty difficulty, SnippetLifecycle lifecycle) {
    CodeSnippet snippet =
        new CodeSnippet(
            UUID.randomUUID(),
            1,
            "Title",
            source,
            sha256Hex(source),
            difficulty,
            category,
            lifecycle);
    ReflectionTestUtils.setField(snippet, "id", revisionId);
    return snippet;
  }

  private SnippetResponse response(CodeSnippet snippet) {
    return new SnippetResponse(
        snippet.getId(),
        snippet.getSnippetId(),
        snippet.getRevisionNumber(),
        snippet.getTitle(),
        snippet.getSource(),
        snippet.getDifficulty(),
        snippet.getLifecycle(),
        categoryId,
        null,
        null,
        0L);
  }

  private static String sha256Hex(String value) {
    try {
      return HexFormat.of()
          .formatHex(
              MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
    } catch (NoSuchAlgorithmException e) {
      throw new IllegalStateException(e);
    }
  }
}
