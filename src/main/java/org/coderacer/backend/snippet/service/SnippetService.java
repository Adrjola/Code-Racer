package org.coderacer.backend.snippet.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import lombok.RequiredArgsConstructor;
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
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class SnippetService {

  private static final int MAX_TITLE_LENGTH = 200;
  private static final int MAX_SOURCE_LENGTH = 10000;

  private final CodeSnippetRepository repository;
  private final CategoryRepository categoryRepository;
  private final SnippetMapper mapper;

  @Transactional
  public SnippetResponse create(CreateSnippetRequest request) {
    String canonicalSource = canonicalize(request.source());
    validateLengths(request.title(), canonicalSource);
    String contentHash = hash(canonicalSource);
    requireNoDuplicateActiveContent(contentHash);
    Category category = requireAvailableCategory(request.categoryId());

    CodeSnippet snippet =
        CodeSnippet.firstRevision(
            request.title(), canonicalSource, contentHash, request.difficulty(), category);
    return saveAndMap(snippet);
  }

  @Transactional
  public SnippetResponse update(UUID id, UpdateSnippetRequest request) {
    CodeSnippet existing = findOrThrow(id);
    requireExpectedVersion(existing, request.version());
    requireEditableLifecycle(existing);

    String canonicalSource = canonicalize(request.source());
    validateLengths(request.title(), canonicalSource);
    String contentHash = hash(canonicalSource);
    Category category = requireAvailableCategory(request.categoryId());

    if (!gameplayChanged(existing, contentHash, request.difficulty(), category)) {
      existing.rename(request.title());
      return saveAndMap(existing);
    }

    requireNoDuplicateActiveContent(contentHash, existing.getId());
    existing.retire();
    repository.saveAndFlush(existing);

    CodeSnippet revision =
        CodeSnippet.nextRevision(
            existing.getSnippetId(),
            nextRevisionNumber(existing.getSnippetId()),
            request.title(),
            canonicalSource,
            contentHash,
            request.difficulty(),
            category);
    return saveAndMap(revision);
  }

  @Transactional
  public SnippetResponse activate(UUID id) {
    return transition(id, SnippetLifecycle.INACTIVE, SnippetLifecycle.ACTIVE, "activate");
  }

  @Transactional
  public SnippetResponse deactivate(UUID id) {
    return transition(id, SnippetLifecycle.ACTIVE, SnippetLifecycle.INACTIVE, "deactivate");
  }

  @Transactional
  public SnippetResponse restore(UUID id) {
    return transition(id, SnippetLifecycle.DELETED, SnippetLifecycle.INACTIVE, "restore");
  }

  @Transactional
  public void delete(UUID id) {
    CodeSnippet snippet = findOrThrow(id);
    if (snippet.getLifecycle() == SnippetLifecycle.DELETED) {
      throw illegalTransition(snippet, "delete");
    }
    snippet.softDelete();
    repository.save(snippet);
  }

  @Transactional(readOnly = true)
  public SnippetResponse getById(UUID id) {
    return mapper.toResponse(findOrThrow(id));
  }

  @Transactional(readOnly = true)
  public Page<SnippetResponse> list(
      UUID categoryId, Difficulty difficulty, SnippetLifecycle lifecycle, Pageable pageable) {
    return repository.search(categoryId, difficulty, lifecycle, pageable).map(mapper::toResponse);
  }

  @Transactional(readOnly = true)
  public SnippetResponse randomEligible(UUID categoryId, Difficulty difficulty, UUID excludeId) {
    String excludeContentHash =
        excludeId == null
            ? null
            : repository.findById(excludeId).map(CodeSnippet::getContentHash).orElse(null);

    String difficultyName = difficulty == null ? null : difficulty.name();
    double selectionKey = ThreadLocalRandom.current().nextDouble();
    return repository
        .findFirstEligibleAtOrAfter(categoryId, difficultyName, excludeContentHash, selectionKey)
        .or(
            () ->
                repository.findFirstEligibleBefore(
                    categoryId, difficultyName, excludeContentHash, selectionKey))
        .map(mapper::toResponse)
        .orElseThrow(this::noEligibleSnippet);
  }

  private SnippetResponse transition(
      UUID id, SnippetLifecycle required, SnippetLifecycle target, String action) {
    CodeSnippet snippet = findOrThrow(id);
    if (snippet.getLifecycle() != required) {
      throw illegalTransition(snippet, action);
    }
    if (target == SnippetLifecycle.ACTIVE) {
      requireNoDuplicateActiveContent(snippet.getContentHash());
    }
    applyLifecycle(snippet, target);
    return saveAndMap(snippet);
  }

  private boolean gameplayChanged(
      CodeSnippet existing, String contentHash, Difficulty difficulty, Category category) {
    return !contentHash.equals(existing.getContentHash())
        || difficulty != existing.getDifficulty()
        || !category.getId().equals(existing.getCategory().getId());
  }

  private int nextRevisionNumber(UUID snippetId) {
    return repository
        .findFirstBySnippetIdOrderByRevisionNumberDesc(snippetId)
        .map(latest -> latest.getRevisionNumber() + 1)
        .orElse(1);
  }

  private void requireExpectedVersion(CodeSnippet snippet, long expectedVersion) {
    if (snippet.getVersion() != expectedVersion) {
      throw new ConflictException(
          "Snippet revision was changed by someone else, reload it and try again",
          "VERSION_CONFLICT");
    }
  }

  private void requireEditableLifecycle(CodeSnippet snippet) {
    if (snippet.getLifecycle() == SnippetLifecycle.RETIRED
        || snippet.getLifecycle() == SnippetLifecycle.DELETED) {
      throw illegalTransition(snippet, "update");
    }
  }

  private void requireNoDuplicateActiveContent(String contentHash) {
    if (repository.existsByContentHashAndLifecycle(contentHash, SnippetLifecycle.ACTIVE)) {
      throw duplicateContentConflict();
    }
  }

  private void requireNoDuplicateActiveContent(String contentHash, UUID excludedRevisionId) {
    if (repository.existsByContentHashAndLifecycleAndIdNot(
        contentHash, SnippetLifecycle.ACTIVE, excludedRevisionId)) {
      throw duplicateContentConflict();
    }
  }

  private Category requireAvailableCategory(UUID categoryId) {
    Category category =
        categoryRepository
            .findById(categoryId)
            .orElseThrow(
                () ->
                    new ResourceNotFoundException("Category with id " + categoryId + " not found"));
    if (!category.isActive()) {
      throw new ConflictException(
          "Category '" + category.getName() + "' is not available", "CATEGORY_UNAVAILABLE");
    }
    return category;
  }

  private CodeSnippet findOrThrow(UUID id) {
    return repository
        .findById(id)
        .orElseThrow(
            () -> new ResourceNotFoundException("Snippet revision with id " + id + " not found"));
  }

  private ConflictException illegalTransition(CodeSnippet snippet, String action) {
    return new ConflictException(
        "Cannot " + action + " a revision that is " + snippet.getLifecycle(),
        "ILLEGAL_LIFECYCLE_TRANSITION");
  }

  private SnippetResponse saveAndMap(CodeSnippet snippet) {
    try {
      return mapper.toResponse(repository.saveAndFlush(snippet));
    } catch (DataIntegrityViolationException ex) {
      throw mapDataIntegrityViolation(ex);
    }
  }

  private ConflictException mapDataIntegrityViolation(DataIntegrityViolationException ex) {
    Throwable cause = ex.getMostSpecificCause();
    String detail = cause == null ? "" : cause.getMessage();
    if (detail.contains("uq_code_snippet_active_content_hash")) {
      return duplicateContentConflict();
    }
    if (detail.contains("uq_code_snippet_revision")) {
      return versionConflict();
    }
    return new ConflictException(
        "Snippet revision conflicts with existing data", "SNIPPET_REVISION_CONFLICT");
  }

  private ConflictException duplicateContentConflict() {
    return new ConflictException(
        "An active snippet with identical content already exists", "DUPLICATE_CONTENT");
  }

  private ConflictException versionConflict() {
    return new ConflictException(
        "Snippet revision was changed by someone else, reload it and try again",
        "VERSION_CONFLICT");
  }

  private ResourceNotFoundException noEligibleSnippet() {
    return new ResourceNotFoundException(
        "No eligible snippet is available for the requested filters", "NO_ELIGIBLE_SNIPPET");
  }

  private void applyLifecycle(CodeSnippet snippet, SnippetLifecycle target) {
    switch (target) {
      case ACTIVE -> snippet.activate();
      case INACTIVE -> snippet.deactivate();
      case RETIRED -> snippet.retire();
      case DELETED -> snippet.softDelete();
    }
  }

  private void validateLengths(String title, String canonicalSource) {
    List<String> errors = new ArrayList<>();
    if (codePointLength(title) > MAX_TITLE_LENGTH) {
      errors.add("title must be at most " + MAX_TITLE_LENGTH + " characters");
    }
    if (codePointLength(canonicalSource) > MAX_SOURCE_LENGTH) {
      errors.add("source must be at most " + MAX_SOURCE_LENGTH + " characters");
    }
    if (!errors.isEmpty()) {
      throw new ValidationException("Validation failed: " + String.join("; ", errors));
    }
  }

  private static String canonicalize(String source) {
    return source.replace("\r\n", "\n").replace("\r", "\n");
  }

  private static String hash(String canonicalSource) {
    try {
      byte[] digest =
          MessageDigest.getInstance("SHA-256")
              .digest(canonicalSource.getBytes(StandardCharsets.UTF_8));
      return HexFormat.of().formatHex(digest);
    } catch (NoSuchAlgorithmException e) {
      throw new IllegalStateException("SHA-256 is required but unavailable", e);
    }
  }

  private static int codePointLength(String text) {
    return text.codePointCount(0, text.length());
  }
}
