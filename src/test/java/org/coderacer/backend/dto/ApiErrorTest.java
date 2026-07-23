package org.coderacer.backend.dto;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

class ApiErrorTest {

  @Test
  void of_createsSimpleApiErrorResponse() {
    ApiError error =
        ApiError.of(
            HttpStatus.CONFLICT, "/api/auth/register", "USER_ALREADY_EXISTS", "Duplicate user");

    assertThat(error.status()).isEqualTo(409);
    assertThat(error.instance()).isEqualTo("/api/auth/register");
    assertThat(error.code()).isEqualTo("USER_ALREADY_EXISTS");
    assertThat(error.message()).isEqualTo("Duplicate user");
  }
}
