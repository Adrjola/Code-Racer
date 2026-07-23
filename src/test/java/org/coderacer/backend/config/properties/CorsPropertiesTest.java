package org.coderacer.backend.config.properties;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import java.util.Collections;
import java.util.List;
import org.junit.jupiter.api.Test;

class CorsPropertiesTest {

  private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

  @Test
  void shouldAcceptExplicitAllowedOrigins() {
    CorsProperties properties = new CorsProperties(List.of("http://localhost:5173"));

    assertThat(validator.validate(properties)).isEmpty();
  }

  @Test
  void shouldTrimAllowedOrigins() {
    CorsProperties properties = new CorsProperties(List.of(" http://localhost:5173 "));

    assertThat(properties.allowedOrigins()).containsExactly("http://localhost:5173");
    assertThat(validator.validate(properties)).isEmpty();
  }

  @Test
  void shouldRejectBlankAllowedOrigins() {
    CorsProperties properties = new CorsProperties(List.of(" "));

    assertThat(validator.validate(properties)).isNotEmpty();
  }

  @Test
  void shouldRejectMissingAllowedOrigins() {
    CorsProperties properties = new CorsProperties(null);

    assertThat(validator.validate(properties)).isNotEmpty();
  }

  @Test
  void shouldRejectNullAllowedOriginEntries() {
    CorsProperties properties = new CorsProperties(Collections.singletonList(null));

    assertThat(validator.validate(properties)).isNotEmpty();
  }

  @Test
  void shouldRejectWildcardAllowedOrigins() {
    CorsProperties properties = new CorsProperties(List.of(" * "));

    assertThat(validator.validate(properties))
        .anyMatch(
            violation ->
                violation
                    .getMessage()
                    .equals("Wildcard CORS origins are not allowed when credentials are enabled"));
  }
}
