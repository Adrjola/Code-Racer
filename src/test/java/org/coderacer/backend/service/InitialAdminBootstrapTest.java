package org.coderacer.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import org.coderacer.backend.config.properties.AdminBootstrapProperties;
import org.coderacer.backend.dto.UserRegistrationRequest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class InitialAdminBootstrapTest {

  @Mock private UserRegistrationService service;

  @Test
  void run_skipsWhenDisabled() {
    InitialAdminBootstrap bootstrap =
        new InitialAdminBootstrap(new AdminBootstrapProperties(false, null, null, null), service);

    bootstrap.run(null);

    verifyNoInteractions(service);
  }

  @Test
  void run_skipsWhenAdminAlreadyExists() {
    InitialAdminBootstrap bootstrap =
        new InitialAdminBootstrap(
            new AdminBootstrapProperties(
                true, "admin@example.com", "root_admin", "StrongerPass123"),
            service);
    when(service.adminExists()).thenReturn(true);

    bootstrap.run(null);

    verify(service).adminExists();
    verify(service, never()).createInitialAdmin(any());
  }

  @Test
  void run_failsWhenEnabledWithoutCompleteCredentials() {
    InitialAdminBootstrap bootstrap =
        new InitialAdminBootstrap(
            new AdminBootstrapProperties(true, "admin@example.com", "", "StrongerPass123"),
            service);
    when(service.adminExists()).thenReturn(false);

    assertThatThrownBy(() -> bootstrap.run(null)).isInstanceOf(IllegalStateException.class);
    verify(service, never()).createInitialAdmin(any());
  }

  @Test
  void run_createsInitialAdminWithMatchingConfirmation() {
    InitialAdminBootstrap bootstrap =
        new InitialAdminBootstrap(
            new AdminBootstrapProperties(
                true, "admin@example.com", "root_admin", "StrongerPass123"),
            service);
    when(service.adminExists()).thenReturn(false);

    bootstrap.run(null);

    ArgumentCaptor<UserRegistrationRequest> requestCaptor =
        ArgumentCaptor.forClass(UserRegistrationRequest.class);
    verify(service).createInitialAdmin(requestCaptor.capture());
    UserRegistrationRequest request = requestCaptor.getValue();
    assertThat(request.email()).isEqualTo("admin@example.com");
    assertThat(request.username()).isEqualTo("root_admin");
    assertThat(request.confirmPassword()).isEqualTo(request.password());
  }
}
