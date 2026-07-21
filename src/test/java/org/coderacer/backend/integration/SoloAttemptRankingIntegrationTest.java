package org.coderacer.backend.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.util.UUID;
import org.coderacer.backend.dto.SoloAttemptRankingResponse;
import org.coderacer.backend.enums.Difficulty;
import org.coderacer.backend.enums.UserRole;
import org.coderacer.backend.exception.ConflictException;
import org.coderacer.backend.model.Category;
import org.coderacer.backend.model.CodeSnippet;
import org.coderacer.backend.model.SoloAttempt;
import org.coderacer.backend.model.User;
import org.coderacer.backend.repository.CategoryRepository;
import org.coderacer.backend.repository.CodeSnippetRepository;
import org.coderacer.backend.repository.SoloAttemptRepository;
import org.coderacer.backend.repository.UserRepository;
import org.coderacer.backend.service.SoloAttemptRankingService;
import org.coderacer.backend.support.AbstractPostgresIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;

@Transactional
class SoloAttemptRankingIntegrationTest extends AbstractPostgresIntegrationTest {

  @Autowired private SoloAttemptRankingService rankingService;
  @Autowired private SoloAttemptRepository attemptRepository;
  @Autowired private CodeSnippetRepository codeSnippetRepository;
  @Autowired private CategoryRepository categoryRepository;
  @Autowired private UserRepository userRepository;

  private final Instant now = Instant.parse("2026-01-01T00:00:00Z");

  @Test
  void rankIsOnePlusTheNumberOfFasterPlayersOnTheSameSnippet() {
    CodeSnippet snippet = newSnippet();
    User alice = newUser("alice");
    completed(newUser("faster_one"), snippet, 10_000L, 500);
    completed(newUser("faster_two"), snippet, 20_000L, 400);
    completed(newUser("slower"), snippet, 90_000L, 100);
    SoloAttempt run = completed(alice, snippet, 30_000L, 300);

    SoloAttemptRankingResponse response = rankingService.forAttempt(run.getId(), alice.getId());

    assertThat(response.globalRank()).isEqualTo(3);
    assertThat(response.newPersonalBest()).isTrue();
    assertThat(response.previousGlobalRank()).isNull();
  }

  @Test
  void ownEarlierRunsDoNotPushThePlayerDownTheBoard() {
    CodeSnippet snippet = newSnippet();
    User alice = newUser("alice");
    completed(newUser("rival"), snippet, 10_000L, 500);
    completed(alice, snippet, 20_000L, 400);
    SoloAttempt slowerRepeat = completed(alice, snippet, 50_000L, 200);

    SoloAttemptRankingResponse response =
        rankingService.forAttempt(slowerRepeat.getId(), alice.getId());

    assertThat(response.newPersonalBest()).isFalse();
    // Only the rival is genuinely ahead, so both the run and the held rank sit
    // at 2 rather than the repeat demoting the player behind their own time.
    assertThat(response.attemptRank()).isEqualTo(2);
    assertThat(response.globalRank()).isEqualTo(2);
    assertThat(response.previousBestDurationMs()).isEqualTo(20_000L);
  }

  @Test
  void improvingClimbsPastThePlayersOwnPreviousRank() {
    CodeSnippet snippet = newSnippet();
    User alice = newUser("alice");
    completed(newUser("rival_one"), snippet, 10_000L, 500);
    completed(newUser("rival_two"), snippet, 30_000L, 300);
    completed(alice, snippet, 40_000L, 250);
    SoloAttempt improved = completed(alice, snippet, 20_000L, 450);

    SoloAttemptRankingResponse response =
        rankingService.forAttempt(improved.getId(), alice.getId());

    assertThat(response.newPersonalBest()).isTrue();
    assertThat(response.globalRank()).isEqualTo(2);
    assertThat(response.previousGlobalRank()).isEqualTo(3);
  }

  @Test
  void otherSnippetsHaveTheirOwnSeparateBoard() {
    CodeSnippet snippet = newSnippet();
    CodeSnippet otherSnippet = newSnippet();
    User alice = newUser("alice");
    completed(newUser("elsewhere"), otherSnippet, 1_000L, 900);
    completed(alice, otherSnippet, 2_000L, 800);
    SoloAttempt run = completed(alice, snippet, 30_000L, 300);

    SoloAttemptRankingResponse response = rankingService.forAttempt(run.getId(), alice.getId());

    assertThat(response.globalRank()).isEqualTo(1);
    // The faster run on the other snippet is not a previous best here.
    assertThat(response.previousBestDurationMs()).isNull();
  }

  @Test
  void deletedPlayersDropOffTheBoard() {
    CodeSnippet snippet = newSnippet();
    User alice = newUser("alice");
    User banned = newUser("banned");
    completed(banned, snippet, 1_000L, 900);
    banned.setDeleted(true);
    userRepository.saveAndFlush(banned);
    SoloAttempt run = completed(alice, snippet, 30_000L, 300);

    SoloAttemptRankingResponse response = rankingService.forAttempt(run.getId(), alice.getId());

    assertThat(response.globalRank()).isEqualTo(1);
  }

  @Test
  void abandonedRunsAreNotRanked() {
    CodeSnippet snippet = newSnippet();
    User alice = newUser("alice");
    SoloAttempt abandoned = new SoloAttempt(alice, snippet, Difficulty.EASY, now);
    abandoned.abandon();
    attemptRepository.saveAndFlush(abandoned);

    assertThatThrownBy(() -> rankingService.forAttempt(abandoned.getId(), alice.getId()))
        .isInstanceOf(ConflictException.class);
  }

  @Test
  void abandonedRunsAlsoDoNotCountTowardsAnybodyElsesRank() {
    CodeSnippet snippet = newSnippet();
    User alice = newUser("alice");
    SoloAttempt ghost = new SoloAttempt(newUser("ghost"), snippet, Difficulty.EASY, now);
    ghost.abandon();
    attemptRepository.saveAndFlush(ghost);
    SoloAttempt run = completed(alice, snippet, 30_000L, 300);

    SoloAttemptRankingResponse response = rankingService.forAttempt(run.getId(), alice.getId());

    assertThat(response.globalRank()).isEqualTo(1);
  }

  private SoloAttempt completed(User user, CodeSnippet snippet, long durationMs, int cpm) {
    SoloAttempt attempt = new SoloAttempt(user, snippet, Difficulty.EASY, now);
    attempt.activate();
    attempt.complete(now.plusMillis(durationMs), durationMs, cpm);
    return attemptRepository.saveAndFlush(attempt);
  }

  private CodeSnippet newSnippet() {
    Category category = new Category();
    category.setName("Category " + UUID.randomUUID());
    category.setActive(true);
    category = categoryRepository.save(category);
    String source = UUID.randomUUID().toString();
    return codeSnippetRepository.save(
        new CodeSnippet(source, source, sha256Hex(source), Difficulty.EASY, category));
  }

  private String sha256Hex(String value) {
    try {
      byte[] digest =
          java.security.MessageDigest.getInstance("SHA-256")
              .digest(value.getBytes(java.nio.charset.StandardCharsets.UTF_8));
      return java.util.HexFormat.of().formatHex(digest);
    } catch (java.security.NoSuchAlgorithmException e) {
      throw new IllegalStateException(e);
    }
  }

  private User newUser(String username) {
    User user = new User();
    user.setEmail(username + UUID.randomUUID() + "@example.com");
    user.setUsername(username + UUID.randomUUID().toString().substring(0, 8));
    user.setPasswordHash("hashed-password");
    user.setRole(UserRole.USER);
    user.setEmailVerified(true);
    user.setDeleted(false);
    return userRepository.save(user);
  }
}
