package org.coderacer.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.coderacer.backend.dto.CategoryRequest;
import org.coderacer.backend.dto.CategoryResponse;
import org.coderacer.backend.exception.ConflictException;
import org.coderacer.backend.exception.ResourceNotFoundException;
import org.coderacer.backend.mapper.CategoryMapper;
import org.coderacer.backend.model.Category;
import org.coderacer.backend.repository.CategoryRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

@ExtendWith(MockitoExtension.class)
class CategoryServiceTest {

  @Mock private CategoryRepository repository;
  @Mock private CategoryMapper mapper;
  @InjectMocks private CategoryService service;

  private final UUID id = UUID.randomUUID();
  private final CategoryRequest request = new CategoryRequest("Arrays", "Array problems");
  private final CategoryResponse response =
      new CategoryResponse(id, "Arrays", "Array problems", true, Instant.now(), Instant.now());

  @Test
  void create_persistsAndReturns_whenNameIsUnique() {
    when(repository.existsByName("Arrays")).thenReturn(false);
    when(repository.saveAndFlush(any(Category.class))).thenAnswer(inv -> inv.getArgument(0));
    when(mapper.toResponse(any(Category.class))).thenReturn(response);

    assertThat(service.create(request)).isEqualTo(response);
    verify(repository).saveAndFlush(any(Category.class));
  }

  @Test
  void create_throwsConflict_whenNameAlreadyExists() {
    when(repository.existsByName("Arrays")).thenReturn(true);

    assertThatThrownBy(() -> service.create(request)).isInstanceOf(ConflictException.class);
    verify(repository, never()).saveAndFlush(any());
  }

  @Test
  void update_changesFields_whenValid() {
    Category existing = new Category();
    existing.setName("Old");
    when(repository.findById(id)).thenReturn(Optional.of(existing));
    when(repository.existsByNameAndIdNot("Arrays", id)).thenReturn(false);
    when(repository.saveAndFlush(existing)).thenReturn(existing);
    when(mapper.toResponse(existing)).thenReturn(response);

    assertThat(service.update(id, request)).isEqualTo(response);
    assertThat(existing.getName()).isEqualTo("Arrays");
    assertThat(existing.getDescription()).isEqualTo("Array problems");
  }

  @Test
  void update_throwsNotFound_whenMissing() {
    when(repository.findById(id)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> service.update(id, request))
        .isInstanceOf(ResourceNotFoundException.class);
  }

  @Test
  void update_throwsConflict_whenNameTakenByAnother() {
    when(repository.findById(id)).thenReturn(Optional.of(new Category()));
    when(repository.existsByNameAndIdNot("Arrays", id)).thenReturn(true);

    assertThatThrownBy(() -> service.update(id, request)).isInstanceOf(ConflictException.class);
    verify(repository, never()).saveAndFlush(any());
  }

  @Test
  void delete_softDeletes_whenFound() {
    Category existing = new Category();
    existing.setActive(true);
    when(repository.findById(id)).thenReturn(Optional.of(existing));

    service.delete(id);

    assertThat(existing.isActive()).isFalse();
    verify(repository).save(existing);
  }

  @Test
  void delete_throwsNotFound_whenMissing() {
    when(repository.findById(id)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> service.delete(id)).isInstanceOf(ResourceNotFoundException.class);
  }

  @Test
  void restore_reactivates_whenFound() {
    Category existing = new Category();
    existing.setActive(false);
    when(repository.findById(id)).thenReturn(Optional.of(existing));
    when(repository.saveAndFlush(existing)).thenReturn(existing);
    when(mapper.toResponse(existing)).thenReturn(response);

    service.restore(id);

    assertThat(existing.isActive()).isTrue();
  }

  @Test
  void restore_throwsNotFound_whenMissing() {
    when(repository.findById(id)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> service.restore(id)).isInstanceOf(ResourceNotFoundException.class);
  }

  @Test
  void getById_returnsResponse_whenFound() {
    Category existing = new Category();
    when(repository.findById(id)).thenReturn(Optional.of(existing));
    when(mapper.toResponse(existing)).thenReturn(response);

    assertThat(service.getById(id)).isEqualTo(response);
  }

  @Test
  void getById_throwsNotFound_whenMissing() {
    when(repository.findById(id)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> service.getById(id)).isInstanceOf(ResourceNotFoundException.class);
  }

  @Test
  void list_mapsAllCategories() {
    Pageable pageable = PageRequest.of(0, 10);
    Category existing = new Category();
    when(repository.findAll(pageable)).thenReturn(new PageImpl<>(List.of(existing)));
    when(mapper.toResponse(existing)).thenReturn(response);

    assertThat(service.list(pageable).getContent()).containsExactly(response);
  }

  @Test
  void listActive_mapsOnlyActiveCategories() {
    Pageable pageable = PageRequest.of(0, 10);
    Category existing = new Category();
    when(repository.findByActiveTrue(pageable)).thenReturn(new PageImpl<>(List.of(existing)));
    when(mapper.toResponse(existing)).thenReturn(response);

    assertThat(service.listActive(pageable).getContent()).containsExactly(response);
  }
}
