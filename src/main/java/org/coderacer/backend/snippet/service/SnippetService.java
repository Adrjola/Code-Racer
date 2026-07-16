package org.coderacer.backend.snippet.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.coderacer.backend.category.model.Category;
import org.coderacer.backend.category.repository.CategoryRepository;
import org.coderacer.backend.common.error.FieldError;
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

    CodeSnippet snippet = new CodeSnippet();
    snippet.setSnippetId(UUID.randomUUID());
    snippet.setRevisionNumber(1);
    snippet.setTitle(request.title());
    snippet.setSource(canonicalSource);
    snippet.setContentHash(contentHash);
    snippet.setDifficulty(request.difficulty());
    snippet.setCategory(category);
    snippet.setLifecycle(SnippetLifecycle.ACTIVE);
    return mapper.toResponse(repository.saveAndFlush(snippet));
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
      existing.setTitle(request.title());
      return mapper.toResponse(repository.saveAndFlush(existing));
    }

    requireNoDuplicateActiveContent(contentHash);
    existing.setLifecycle(SnippetLifecycle.RETIRED);
    repository.save(existing);

    CodeSnippet revision = new CodeSnippet();
    revision.setSnippetId(existing.getSnippetId());
    revision.setRevisionNumber(nextRevisionNumber(existing.getSnippetId()));
    revision.setTitle(request.title());
    revision.setSource(canonicalSource);
    revision.setContentHash(contentHash);
    revision.setDifficulty(request.difficulty());
    revision.setCategory(category);
    revision.setLifecycle(SnippetLifecycle.ACTIVE);
    return mapper.toResponse(repository.saveAndFlush(revision));
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
    snippet.setLifecycle(SnippetLifecycle.DELETED);
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

    return repository
        .findRandomEligible(
            categoryId, difficulty == null ? null : difficulty.name(), excludeContentHash)
        .map(mapper::toResponse)
        .orElseThrow(
            () ->
                new ResourceNotFoundException(
                    "No eligible snippet is available for the requested filters",
                    "NO_ELIGIBLE_SNIPPET"));
  }

  private SnippetResponse transition(
      UUID id, SnippetLifecycle required, SnippetLifecycle target, String action) {
    CodeSnippet snippet = findOrThrow(id);
    if (snippet.getLifecycle() != required) {
      throw illegalTransition(snippet, action);
    }
    snippet.setLifecycle(target);
    return mapper.toResponse(repository.saveAndFlush(snippet));
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
      throw new ConflictException(
          "An active snippet with identical content already exists", "DUPLICATE_CONTENT");
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

  private void validateLengths(String title, String canonicalSource) {
    List<FieldError> errors = new ArrayList<>();
    if (codePointLength(title) > MAX_TITLE_LENGTH) {
      errors.add(new FieldError("title", "must be at most " + MAX_TITLE_LENGTH + " characters"));
    }
    if (codePointLength(canonicalSource) > MAX_SOURCE_LENGTH) {
      errors.add(new FieldError("source", "must be at most " + MAX_SOURCE_LENGTH + " characters"));
    }
    if (!errors.isEmpty()) {
      throw new ValidationException("Validation failed", errors);
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
