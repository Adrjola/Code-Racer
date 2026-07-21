package org.coderacer.backend.service;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import lombok.RequiredArgsConstructor;
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
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Snippets are created once and never edited. The only change an admin can make afterwards is a
 * one-way soft delete, which hides the snippet from players while keeping it readable in the admin
 * catalog.
 */
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
        new CodeSnippet(
            request.title(), canonicalSource, contentHash, request.difficulty(), category);
    return saveAndMap(snippet);
  }

  @Transactional
  public void delete(UUID id) {
    CodeSnippet snippet = findOrThrow(id);
    if (snippet.isDeleted()) {
      throw new ConflictException("Snippet is already deleted", "ILLEGAL_LIFECYCLE_TRANSITION");
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

  private void requireNoDuplicateActiveContent(String contentHash) {
    if (repository.existsByContentHashAndLifecycle(contentHash, SnippetLifecycle.ACTIVE)) {
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
        .orElseThrow(() -> new ResourceNotFoundException("Snippet with id " + id + " not found"));
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
    return new ConflictException("Snippet conflicts with existing data", "SNIPPET_CONFLICT");
  }

  private ConflictException duplicateContentConflict() {
    return new ConflictException(
        "An active snippet with identical content already exists", "DUPLICATE_CONTENT");
  }

  private ResourceNotFoundException noEligibleSnippet() {
    return new ResourceNotFoundException(
        "No eligible snippet is available for the requested filters", "NO_ELIGIBLE_SNIPPET");
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
    return Sha256Hasher.hashHex(canonicalSource);
  }

  private static int codePointLength(String text) {
    return text.codePointCount(0, text.length());
  }
}
