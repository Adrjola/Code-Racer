package org.coderacer.backend.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.util.UUID;
import org.coderacer.backend.dto.AdminUserResponse;
import org.coderacer.backend.enums.UserRole;
import org.coderacer.backend.exception.ConflictException;
import org.coderacer.backend.model.User;
import org.coderacer.backend.repository.UserRepository;
import org.coderacer.backend.service.AdminUserService;
import org.coderacer.backend.support.AbstractPostgresIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.annotation.Transactional;

@Transactional
class AdminUserIntegrationTest extends AbstractPostgresIntegrationTest {

  @Autowired private AdminUserService service;
  @Autowired private UserRepository userRepository;

  @Test
  void list_filtersByRoleAndEnabledAndDeletedState() {
    User activeUser = saveUser("player_one", UserRole.USER, true, true, false);
    User disabledUser = saveUser("player_two", UserRole.USER, true, false, false);
    saveUser("admin_one", UserRole.ADMIN, true, true, false);

    var page = service.list(UserRole.USER, null, false, false, PageRequest.of(0, 10));

    assertThat(page.getContent())
        .extracting(AdminUserResponse::id)
        .containsExactly(disabledUser.getId())
        .doesNotContain(activeUser.getId());
  }

  @Test
  void list_withNoFilters_returnsEveryAccountRegardlessOfState() {
    saveUser("visible_one", UserRole.USER, true, true, false);
    User deletedUser = saveUser("visible_two", UserRole.USER, true, true, true);

    var page = service.list(null, null, null, null, PageRequest.of(0, 10));

    assertThat(page.getContent()).extracting(AdminUserResponse::id).contains(deletedUser.getId());
  }

  @Test
  void disableThenEnable_roundTripsEnabledState_withoutTouchingVerification() {
    User user = saveUser("toggle_user", UserRole.USER, false, true, false);
    UUID adminId = UUID.randomUUID();

    AdminUserResponse disabled = service.disable(user.getId(), adminId);
    assertThat(disabled.enabled()).isFalse();
    assertThat(disabled.emailVerified()).isFalse();

    AdminUserResponse enabled = service.enable(user.getId());
    assertThat(enabled.enabled()).isTrue();
    assertThat(enabled.emailVerified()).isFalse();
  }

  @Test
  void adminCannotDisableOrDeleteOwnAccount() {
    User admin = saveUser("self_admin", UserRole.ADMIN, true, true, false);

    assertThatThrownBy(() -> service.disable(admin.getId(), admin.getId()))
        .isInstanceOf(ConflictException.class);
    assertThatThrownBy(() -> service.delete(admin.getId(), admin.getId()))
        .isInstanceOf(ConflictException.class);
    assertThat(userRepository.findById(admin.getId()).orElseThrow().isEnabled()).isTrue();
    assertThat(userRepository.findById(admin.getId()).orElseThrow().isDeleted()).isFalse();
  }

  @Test
  void deleteThenRestore_preservesAccountIdentity() {
    User user = saveUser("restorable_user", UserRole.USER, true, true, false);
    UUID adminId = UUID.randomUUID();
    String originalUsername = user.getUsername();
    String originalEmail = user.getEmail();

    service.delete(user.getId(), adminId);
    assertThat(userRepository.findById(user.getId()).orElseThrow().isDeleted()).isTrue();

    AdminUserResponse restored = service.restore(user.getId());

    assertThat(restored.id()).isEqualTo(user.getId());
    assertThat(restored.username()).isEqualTo(originalUsername);
    assertThat(restored.email()).isEqualTo(originalEmail);
    assertThat(restored.deleted()).isFalse();
  }

  private User saveUser(
      String username, UserRole role, boolean emailVerified, boolean enabled, boolean deleted) {
    User user = new User();
    user.setEmail(username + "@example.com");
    user.setUsername(username);
    user.setPasswordHash("$2a$12$" + "a".repeat(53));
    user.setRole(role);
    user.setEmailVerified(emailVerified);
    user.setEnabled(enabled);
    user.setDeleted(deleted);
    user.setTokenValidFrom(Instant.EPOCH);
    return userRepository.saveAndFlush(user);
  }
}
