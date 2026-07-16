package org.coderacer.backend.category;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.coderacer.backend.AbstractPostgresIntegrationTest;
import org.coderacer.backend.category.dto.CategoryRequest;
import org.coderacer.backend.category.dto.CategoryResponse;
import org.coderacer.backend.category.service.CategoryService;
import org.coderacer.backend.common.exception.ConflictException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.annotation.Transactional;

@Transactional
class CategoryIntegrationTest extends AbstractPostgresIntegrationTest {

  @Autowired private CategoryService service;

  @Test
  void createPersistsWithGeneratedIdAndTimestamps() {
    CategoryResponse created = service.create(new CategoryRequest("Loops", "Loop problems"));

    assertThat(created.id()).isNotNull();
    assertThat(created.createdAt()).isNotNull();
    assertThat(created.active()).isTrue();
    assertThat(service.listActive(PageRequest.of(0, 20)).getContent())
        .extracting(CategoryResponse::name)
        .contains("Loops");
  }

  @Test
  void softDeletedCategoryIsExcludedFromActiveListButRestorable() {
    CategoryResponse created = service.create(new CategoryRequest("Recursion", null));

    service.delete(created.id());
    assertThat(service.listActive(PageRequest.of(0, 20)).getContent())
        .extracting(CategoryResponse::name)
        .doesNotContain("Recursion");
    assertThat(service.getById(created.id()).active()).isFalse();

    service.restore(created.id());
    assertThat(service.listActive(PageRequest.of(0, 20)).getContent())
        .extracting(CategoryResponse::name)
        .contains("Recursion");
  }

  @Test
  void duplicateNameIsRejected() {
    service.create(new CategoryRequest("Strings", null));

    assertThatThrownBy(() -> service.create(new CategoryRequest("Strings", null)))
        .isInstanceOf(ConflictException.class);
  }
}
