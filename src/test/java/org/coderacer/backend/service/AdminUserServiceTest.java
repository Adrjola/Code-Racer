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
import org.coderacer.backend.dto.AdminUserUpdateRequest;
import org.coderacer.backend.enums.UserRole;
import org.coderacer.backend.exception.ConflictException;
import org.coderacer.backend.exception.ResourceNotFoundException;
import org.coderacer.backend.exception.SelfActionForbiddenException;
import org.coderacer.backend.exception.ValidationException;
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

    assertThat(service.list(UserRole.USER, true, false, pageable).getContent())
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
  void delete_softDeletesUndeletedUser() {
    User user = new User();
    user.setDeleted(false);
    when(repository.findById(id)).thenReturn(Optional.of(user));

    service.delete(id, adminId);

    assertThat(user.isDeleted()).isTrue();
    verify(repository).saveAndFlush(user);
  }

  @Test
  void delete_throwsConflict_whenAlreadyDeleted() {
    User user = new User();
    user.setDeleted(true);
    when(repository.findById(id)).thenReturn(Optional.of(user));

    assertThatThrownBy(() -> service.delete(id, adminId))
        .isInstanceOf(ConflictException.class)
        .hasMessageContaining("already deleted");
    verify(repository, never()).saveAndFlush(any());
  }

  @Test
  void delete_throwsForbidden_whenTargetingSelf() {
    User user = new User();
    user.setDeleted(false);
    when(repository.findById(id)).thenReturn(Optional.of(user));

    assertThatThrownBy(() -> service.delete(id, id))
        .isInstanceOf(SelfActionForbiddenException.class)
        .hasMessageContaining("own account");
    verify(repository, never()).saveAndFlush(any());
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
  void update_changesUsernameAndEmail() {
    User user = new User();
    user.setUsername("olduser");
    user.setEmail("old@example.com");
    when(repository.findById(id)).thenReturn(Optional.of(user));
    when(repository.saveAndFlush(user)).thenReturn(user);
    when(mapper.toAdminResponse(user)).thenReturn(response);

    service.update(id, new AdminUserUpdateRequest("newuser", "new@example.com"));

    assertThat(user.getUsername()).isEqualTo("newuser");
    assertThat(user.getEmail()).isEqualTo("new@example.com");
  }

  @Test
  void update_doesNotTouchEmailVerifiedRoleOrDeleted() {
    User user = new User();
    user.setUsername("olduser");
    user.setEmail("old@example.com");
    user.setEmailVerified(true);
    user.setRole(UserRole.ADMIN);
    user.setDeleted(true);
    when(repository.findById(id)).thenReturn(Optional.of(user));
    when(repository.saveAndFlush(user)).thenReturn(user);
    when(mapper.toAdminResponse(user)).thenReturn(response);

    service.update(id, new AdminUserUpdateRequest("newuser", "new@example.com"));

    assertThat(user.isEmailVerified()).isTrue();
    assertThat(user.getRole()).isEqualTo(UserRole.ADMIN);
    assertThat(user.isDeleted()).isTrue();
  }

  @Test
  void update_isNoConflict_whenResubmittingOwnCurrentValues() {
    User user = new User();
    user.setUsername("player");
    user.setEmail("player@example.com");
    when(repository.findById(id)).thenReturn(Optional.of(user));
    when(repository.saveAndFlush(user)).thenReturn(user);
    when(mapper.toAdminResponse(user)).thenReturn(response);

    service.update(id, new AdminUserUpdateRequest("player", "player@example.com"));

    verify(repository, never()).existsByEmailAndIdNot(any(), any());
    verify(repository, never()).existsByUsernameNormalizedAndIdNot(any(), any());
  }

  @Test
  void update_throwsValidation_whenEmailBlank() {
    User user = new User();
    user.setUsername("player");
    user.setEmail("player@example.com");
    when(repository.findById(id)).thenReturn(Optional.of(user));

    assertThatThrownBy(() -> service.update(id, new AdminUserUpdateRequest("player", " ")))
        .isInstanceOf(ValidationException.class);
    verify(repository, never()).saveAndFlush(any());
  }

  @Test
  void update_throwsValidation_whenUsernameInvalid() {
    User user = new User();
    user.setUsername("player");
    user.setEmail("player@example.com");
    when(repository.findById(id)).thenReturn(Optional.of(user));

    assertThatThrownBy(
            () -> service.update(id, new AdminUserUpdateRequest("!!", "player@example.com")))
        .isInstanceOf(ValidationException.class);
    verify(repository, never()).saveAndFlush(any());
  }

  @Test
  void update_throwsConflict_whenEmailTakenByAnotherUser() {
    User user = new User();
    user.setUsername("player");
    user.setEmail("player@example.com");
    when(repository.findById(id)).thenReturn(Optional.of(user));
    when(repository.existsByEmailAndIdNot("taken@example.com", id)).thenReturn(true);

    assertThatThrownBy(
            () -> service.update(id, new AdminUserUpdateRequest("player", "taken@example.com")))
        .isInstanceOf(ConflictException.class)
        .hasMessageContaining("already exists");
    verify(repository, never()).saveAndFlush(any());
  }

  @Test
  void update_throwsConflict_whenUsernameTakenByAnotherUser() {
    User user = new User();
    user.setUsername("player");
    user.setEmail("player@example.com");
    when(repository.findById(id)).thenReturn(Optional.of(user));
    when(repository.existsByUsernameNormalizedAndIdNot("taken", id)).thenReturn(true);

    assertThatThrownBy(
            () -> service.update(id, new AdminUserUpdateRequest("taken", "player@example.com")))
        .isInstanceOf(ConflictException.class)
        .hasMessageContaining("already exists");
    verify(repository, never()).saveAndFlush(any());
  }

  @Test
  void update_throwsNotFound_whenMissing() {
    when(repository.findById(id)).thenReturn(Optional.empty());

    assertThatThrownBy(
            () -> service.update(id, new AdminUserUpdateRequest("player", "player@example.com")))
        .isInstanceOf(ResourceNotFoundException.class);
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
