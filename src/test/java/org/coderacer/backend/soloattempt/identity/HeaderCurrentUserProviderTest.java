package org.coderacer.backend.soloattempt.identity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

import jakarta.servlet.http.HttpServletRequest;
import java.util.UUID;
import org.coderacer.backend.soloattempt.exception.MissingCurrentUserException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class HeaderCurrentUserProviderTest {

  @Mock private HttpServletRequest request;

  private final HeaderCurrentUserProvider provider = new HeaderCurrentUserProvider();

  @Test
  void resolvesValidUuidHeader() {
    UUID userId = UUID.randomUUID();
    when(request.getHeader(HeaderCurrentUserProvider.HEADER_NAME)).thenReturn(userId.toString());

    assertThat(provider.resolve(request)).isEqualTo(userId);
  }

  @Test
  void rejectsMissingHeader() {
    when(request.getHeader(HeaderCurrentUserProvider.HEADER_NAME)).thenReturn(null);

    assertThrows(MissingCurrentUserException.class, () -> provider.resolve(request));
  }

  @Test
  void rejectsBlankHeader() {
    when(request.getHeader(HeaderCurrentUserProvider.HEADER_NAME)).thenReturn("   ");

    assertThrows(MissingCurrentUserException.class, () -> provider.resolve(request));
  }

  @Test
  void rejectsInvalidUuidHeader() {
    when(request.getHeader(HeaderCurrentUserProvider.HEADER_NAME)).thenReturn("not-a-uuid");

    assertThrows(MissingCurrentUserException.class, () -> provider.resolve(request));
  }
}
