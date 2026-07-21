package org.coderacer.backend.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;
import org.coderacer.backend.dto.SoloAttemptResultResponse;
import org.coderacer.backend.enums.Difficulty;
import org.coderacer.backend.enums.SoloAttemptState;
import org.coderacer.backend.enums.UserRole;
import org.coderacer.backend.exception.ValidationException;
import org.coderacer.backend.model.Category;
import org.coderacer.backend.model.CodeSnippet;
import org.coderacer.backend.model.SoloAttempt;
import org.coderacer.backend.model.User;
import org.coderacer.backend.repository.CategoryRepository;
import org.coderacer.backend.repository.CodeSnippetRepository;
import org.coderacer.backend.repository.SoloAttemptRepository;
import org.coderacer.backend.repository.UserRepository;
import org.coderacer.backend.service.SoloAttemptHistoryService;
import org.coderacer.backend.support.AbstractPostgresIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.annotation.Transactional;

@Transactional
class SoloAttemptHistoryIntegrationTest extends AbstractPostgresIntegrationTest {

  @Autowired private SoloAttemptHistoryService historyService;
  @Autowired private SoloAttemptRepository attemptRepository;
  @Autowired private CodeSnippetRepository codeSnippetRepository;
  @Autowired private CategoryRepository categoryRepository;
  @Autowired private UserRepository userRepository;

  private final Instant now = Instant.parse("2026-01-01T00:00:00Z");
  private final PageRequest firstPage = PageRequest.of(0, 20);

  @Test
  void historyReturnsOnlyTheCallersOwnAttempts() {
    User alice = newUser("alice");
    User bob = newUser("bob");
    completedAttempt(alice, newSnippet("alice code", Difficulty.EASY), now);
    completedAttempt(bob, newSnippet("bob code", Difficulty.EASY), now);

    List<SoloAttemptResultResponse> aliceHistory =
        historyService
            .findHistory(alice.getId(), null, null, null, null, null, firstPage)
            .getContent();

    assertThat(aliceHistory).hasSize(1);
    assertThat(aliceHistory.getFirst().snippet().title()).isEqualTo("alice code");
  }

  @Test
  void historyExcludesAttemptsThatAreStillInProgress() {
    User alice = newUser("alice");
    attemptRepository.save(
        new SoloAttempt(alice, newSnippet("in progress", Difficulty.EASY), Difficulty.EASY, now));

    assertThat(historyService.findHistory(alice.getId(), null, null, null, null, null, firstPage))
        .isEmpty();
  }

  @Test
  void filteringByANonTerminalStateIsRejected() {
    User alice = newUser("alice");

    assertThatThrownBy(
            () ->
                historyService.findHistory(
                    alice.getId(), SoloAttemptState.ACTIVE, null, null, null, null, firstPage))
        .isInstanceOf(ValidationException.class);
  }

  @Test
  void emptyHistoryReturnsAnEmptyPage() {
    User alice = newUser("alice");

    assertThat(historyService.findHistory(alice.getId(), null, null, null, null, null, firstPage))
        .isEmpty();
  }

  @Test
  void nonFinishersHaveNullDurationAndCpm() {
    User alice = newUser("alice");
    SoloAttempt attempt =
        new SoloAttempt(alice, newSnippet("abandoned", Difficulty.EASY), Difficulty.EASY, now);
    attempt.activate();
    attempt.abandon();
    attemptRepository.save(attempt);

    SoloAttemptResultResponse result =
        historyService
            .findHistory(alice.getId(), null, null, null, null, null, firstPage)
            .getContent()
            .getFirst();

    assertThat(result.state()).isEqualTo(SoloAttemptState.ABANDONED);
    assertThat(result.durationMs()).isNull();
    assertThat(result.cpm()).isNull();
    assertThat(result.finishedAt()).isNull();
  }

  @Test
  void completedAttemptsCarryTheServerPersistedMetrics() {
    User alice = newUser("alice");
    completedAttempt(alice, newSnippet("done", Difficulty.HARD), now);

    SoloAttemptResultResponse result =
        historyService
            .findHistory(alice.getId(), null, null, null, null, null, firstPage)
            .getContent()
            .getFirst();

    assertThat(result.state()).isEqualTo(SoloAttemptState.COMPLETED);
    assertThat(result.durationMs()).isEqualTo(30_000L);
    assertThat(result.cpm()).isEqualTo(240);
    assertThat(result.startedAt()).isEqualTo(now);
    assertThat(result.finishedAt()).isNotNull();
  }

  @Test
  void attemptsOnDeletedSnippetsDisappearFromHistory() {
    User alice = newUser("alice");
    CodeSnippet visible = newSnippet("visible source", Difficulty.EASY);
    CodeSnippet removed = newSnippet("removed source", Difficulty.EASY);
    completedAttempt(alice, visible, now);
    completedAttempt(alice, removed, now);

    removed.softDelete();
    codeSnippetRepository.saveAndFlush(removed);

    List<SoloAttemptResultResponse> history =
        historyService
            .findHistory(alice.getId(), null, null, null, null, null, firstPage)
            .getContent();

    assertThat(history).hasSize(1);
    assertThat(history.getFirst().snippet().title()).isEqualTo("visible source");
  }

  @Test
  void historyCanBeFilteredByStateDifficultyAndCategory() {
    User alice = newUser("alice");
    CodeSnippet easy = newSnippet("easy one", Difficulty.EASY);
    CodeSnippet hard = newSnippet("hard one", Difficulty.HARD);
    completedAttempt(alice, easy, now);
    abandonedAttempt(alice, hard, now);

    assertThat(
            historyService
                .findHistory(
                    alice.getId(), SoloAttemptState.COMPLETED, null, null, null, null, firstPage)
                .getContent())
        .singleElement()
        .satisfies(r -> assertThat(r.snippet().title()).isEqualTo("easy one"));

    assertThat(
            historyService
                .findHistory(alice.getId(), null, null, Difficulty.HARD, null, null, firstPage)
                .getContent())
        .singleElement()
        .satisfies(r -> assertThat(r.snippet().title()).isEqualTo("hard one"));

    assertThat(
            historyService
                .findHistory(
                    alice.getId(), null, hard.getCategory().getId(), null, null, null, firstPage)
                .getContent())
        .singleElement()
        .satisfies(r -> assertThat(r.snippet().title()).isEqualTo("hard one"));
  }

  @Test
  void historyCanBeFilteredByStartedDateRange() {
    User alice = newUser("alice");
    completedAttempt(alice, newSnippet("old", Difficulty.EASY), now.minusSeconds(86_400));
    completedAttempt(alice, newSnippet("recent", Difficulty.EASY), now);

    assertThat(
            historyService
                .findHistory(alice.getId(), null, null, null, now.minusSeconds(60), null, firstPage)
                .getContent())
        .singleElement()
        .satisfies(r -> assertThat(r.snippet().title()).isEqualTo("recent"));
  }

  @Test
  void paginationStaysDeterministicWhenAttemptsShareATimestamp() {
    User alice = newUser("alice");
    for (int i = 0; i < 5; i++) {
      completedAttempt(alice, newSnippet("tied " + i, Difficulty.EASY), now);
    }

    List<UUID> firstPageIds = pageOfIds(alice, PageRequest.of(0, 2));
    List<UUID> secondPageIds = pageOfIds(alice, PageRequest.of(1, 2));
    List<UUID> thirdPageIds = pageOfIds(alice, PageRequest.of(2, 2));

    assertThat(firstPageIds).doesNotContainAnyElementsOf(secondPageIds);
    assertThat(secondPageIds).doesNotContainAnyElementsOf(thirdPageIds);
    assertThat(firstPageIds).doesNotContainAnyElementsOf(thirdPageIds);
    assertThat(pageOfIds(alice, PageRequest.of(0, 2))).isEqualTo(firstPageIds);
  }

  private List<UUID> pageOfIds(User user, PageRequest page) {
    return historyService
        .findHistory(user.getId(), null, null, null, null, null, page)
        .getContent()
        .stream()
        .map(SoloAttemptResultResponse::attemptId)
        .toList();
  }

  private SoloAttempt completedAttempt(User user, CodeSnippet snippet, Instant startedAt) {
    SoloAttempt attempt = new SoloAttempt(user, snippet, snippet.getDifficulty(), startedAt);
    attempt.activate();
    attempt.complete(startedAt.plusSeconds(30), 30_000L, 240);
    return attemptRepository.save(attempt);
  }

  private SoloAttempt abandonedAttempt(User user, CodeSnippet snippet, Instant startedAt) {
    SoloAttempt attempt = new SoloAttempt(user, snippet, snippet.getDifficulty(), startedAt);
    attempt.activate();
    attempt.abandon();
    return attemptRepository.save(attempt);
  }

  private User newUser(String username) {
    User user = new User();
    user.setEmail(username + "@example.com");
    user.setUsername(username);
    user.setPasswordHash("hashed-password");
    user.setRole(UserRole.USER);
    user.setEmailVerified(true);
    user.setEnabled(true);
    user.setDeleted(false);
    return userRepository.save(user);
  }

  private CodeSnippet newSnippet(String source, Difficulty difficulty) {
    Category category = new Category();
    category.setName("Category " + UUID.randomUUID());
    category.setActive(true);
    category = categoryRepository.save(category);
    return codeSnippetRepository.save(
        new CodeSnippet(source, source, sha256Hex(source), difficulty, category));
  }

  private static String sha256Hex(String value) {
    try {
      return HexFormat.of()
          .formatHex(
              MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
    } catch (NoSuchAlgorithmException e) {
      throw new IllegalStateException(e);
    }
  }
}
