package org.coderacer.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.lang.reflect.RecordComponent;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.coderacer.backend.dto.AdminUserResponse;
import org.coderacer.backend.enums.UserRole;
import org.coderacer.backend.exception.ConflictException;
import org.coderacer.backend.exception.ResourceNotFoundException;
import org.coderacer.backend.mapper.UserMapper;
import org.coderacer.backend.model.User;
import org.coderacer.backend.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

@ExtendWith(MockitoExtension.class)
class AdminUserServiceTest {

  @Mock private UserRepository repository;
  @Mock private UserMapper mapper;
  @InjectMocks private AdminUserService service;

  private final UUID id = UUID.randomUUID();
  private final UUID adminId = UUID.randomUUID();
  private final AdminUserResponse response =
      new AdminUserResponse(
          id,
          "player",
          "player@example.com",
          UserRole.USER,
          true,
          true,
          false,
          Instant.now(),
          Instant.now());

  @Test
  void list_mapsFilteredPage() {
    Pageable pageable = PageRequest.of(0, 10);
    User user = new User();
    when(repository.findAll(any(Specification.class), eq(pageable)))
        .thenReturn(new PageImpl<>(List.of(user)));
    when(mapper.toAdminResponse(user)).thenReturn(response);

    assertThat(service.list(UserRole.USER, true, true, false, pageable).getContent())
        .containsExactly(response);
  }

  @Test
  void getById_returnsResponse_whenFound() {
    User user = new User();
    when(repository.findById(id)).thenReturn(Optional.of(user));
    when(mapper.toAdminResponse(user)).thenReturn(response);

    assertThat(service.getById(id)).isEqualTo(response);
  }

  @Test
  void getById_throwsNotFound_whenMissing() {
    when(repository.findById(id)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> service.getById(id)).isInstanceOf(ResourceNotFoundException.class);
  }

  @Test
  void disable_disablesEnabledUser() {
    User user = new User();
    user.setEnabled(true);
    when(repository.findById(id)).thenReturn(Optional.of(user));
    when(repository.saveAndFlush(user)).thenReturn(user);
    when(mapper.toAdminResponse(user)).thenReturn(response);

    service.disable(id, adminId);

    assertThat(user.isEnabled()).isFalse();
  }

  @Test
  void disable_throwsConflict_whenAlreadyDisabled() {
    User user = new User();
    user.setEnabled(false);
    when(repository.findById(id)).thenReturn(Optional.of(user));

    assertThatThrownBy(() -> service.disable(id, adminId))
        .isInstanceOf(ConflictException.class)
        .hasMessageContaining("already disabled");
    verify(repository, never()).saveAndFlush(any());
  }

  @Test
  void disable_throwsConflict_whenTargetingSelf() {
    User user = new User();
    user.setEnabled(true);
    when(repository.findById(id)).thenReturn(Optional.of(user));

    assertThatThrownBy(() -> service.disable(id, id))
        .isInstanceOf(ConflictException.class)
        .hasMessageContaining("own account");
    verify(repository, never()).saveAndFlush(any());
  }

  @Test
  void disable_throwsNotFound_whenMissing() {
    when(repository.findById(id)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> service.disable(id, adminId))
        .isInstanceOf(ResourceNotFoundException.class);
  }

  @Test
  void enable_enablesDisabledUser() {
    User user = new User();
    user.setEnabled(false);
    when(repository.findById(id)).thenReturn(Optional.of(user));
    when(repository.saveAndFlush(user)).thenReturn(user);
    when(mapper.toAdminResponse(user)).thenReturn(response);

    service.enable(id);

    assertThat(user.isEnabled()).isTrue();
  }

  @Test
  void enable_throwsConflict_whenAlreadyEnabled() {
    User user = new User();
    user.setEnabled(true);
    when(repository.findById(id)).thenReturn(Optional.of(user));

    assertThatThrownBy(() -> service.enable(id))
        .isInstanceOf(ConflictException.class)
        .hasMessageContaining("already enabled");
    verify(repository, never()).saveAndFlush(any());
  }

  @Test
  void delete_softDeletesUndeletedUser() {
    User user = new User();
    user.setDeleted(false);
    when(repository.findById(id)).thenReturn(Optional.of(user));

    service.delete(id, adminId);

    assertThat(user.isDeleted()).isTrue();
    verify(repository).save(user);
  }

  @Test
  void delete_throwsConflict_whenAlreadyDeleted() {
    User user = new User();
    user.setDeleted(true);
    when(repository.findById(id)).thenReturn(Optional.of(user));

    assertThatThrownBy(() -> service.delete(id, adminId))
        .isInstanceOf(ConflictException.class)
        .hasMessageContaining("already deleted");
    verify(repository, never()).save(any());
  }

  @Test
  void delete_throwsConflict_whenTargetingSelf() {
    User user = new User();
    user.setDeleted(false);
    when(repository.findById(id)).thenReturn(Optional.of(user));

    assertThatThrownBy(() -> service.delete(id, id))
        .isInstanceOf(ConflictException.class)
        .hasMessageContaining("own account");
    verify(repository, never()).save(any());
  }

  @Test
  void restore_restoresDeletedUser() {
    User user = new User();
    user.setDeleted(true);
    when(repository.findById(id)).thenReturn(Optional.of(user));
    when(repository.saveAndFlush(user)).thenReturn(user);
    when(mapper.toAdminResponse(user)).thenReturn(response);

    service.restore(id);

    assertThat(user.isDeleted()).isFalse();
  }

  @Test
  void restore_throwsConflict_whenNotDeleted() {
    User user = new User();
    user.setDeleted(false);
    when(repository.findById(id)).thenReturn(Optional.of(user));

    assertThatThrownBy(() -> service.restore(id))
        .isInstanceOf(ConflictException.class)
        .hasMessageContaining("not deleted");
    verify(repository, never()).saveAndFlush(any());
  }

  @Test
  void restore_throwsNotFound_whenMissing() {
    when(repository.findById(id)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> service.restore(id)).isInstanceOf(ResourceNotFoundException.class);
  }

  @Test
  void adminUserResponse_neverExposesCredentialOrTokenFields() {
    List<String> componentNames =
        Arrays.stream(AdminUserResponse.class.getRecordComponents())
            .map(RecordComponent::getName)
            .toList();

    assertThat(componentNames)
        .doesNotContainAnyElementsOf(
            List.of(
                "passwordHash",
                "password",
                "tokenValidFrom",
                "verificationEmailResentAt",
                "verificationToken"));
  }
}
