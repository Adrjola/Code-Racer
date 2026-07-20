package org.coderacer.backend.service;

import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.coderacer.backend.dto.CategoryRequest;
import org.coderacer.backend.dto.CategoryResponse;
import org.coderacer.backend.exception.ConflictException;
import org.coderacer.backend.exception.ResourceNotFoundException;
import org.coderacer.backend.mapper.CategoryMapper;
import org.coderacer.backend.model.Category;
import org.coderacer.backend.repository.CategoryRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CategoryService {

  private final CategoryRepository repository;
  private final CategoryMapper mapper;

  @Transactional
  public CategoryResponse create(CategoryRequest request) {
    if (repository.existsByName(request.name())) {
      throw new ConflictException("Category with name '" + request.name() + "' already exists");
    }
    Category category = new Category();
    category.setName(request.name());
    category.setDescription(request.description());
    return mapper.toResponse(repository.saveAndFlush(category));
  }

  @Transactional
  public CategoryResponse update(UUID id, CategoryRequest request) {
    Category category = findOrThrow(id);
    if (repository.existsByNameAndIdNot(request.name(), id)) {
      throw new ConflictException("Category with name '" + request.name() + "' already exists");
    }
    category.setName(request.name());
    category.setDescription(request.description());
    return mapper.toResponse(repository.saveAndFlush(category));
  }

  @Transactional
  public void delete(UUID id) {
    Category category = findOrThrow(id);
    category.setActive(false);
    repository.save(category);
  }

  @Transactional
  public CategoryResponse restore(UUID id) {
    Category category = findOrThrow(id);
    category.setActive(true);
    return mapper.toResponse(repository.saveAndFlush(category));
  }

  @Transactional(readOnly = true)
  public CategoryResponse getById(UUID id) {
    return mapper.toResponse(findOrThrow(id));
  }

  @Transactional(readOnly = true)
  public Page<CategoryResponse> list(Pageable pageable) {
    return repository.findAll(pageable).map(mapper::toResponse);
  }

  @Transactional(readOnly = true)
  public Page<CategoryResponse> listActive(Pageable pageable) {
    return repository.findByActiveTrue(pageable).map(mapper::toResponse);
  }

  private Category findOrThrow(UUID id) {
    return repository
        .findById(id)
        .orElseThrow(() -> new ResourceNotFoundException("Category with id " + id + " not found"));
  }
}
