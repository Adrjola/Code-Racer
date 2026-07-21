package org.coderacer.backend.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

import jakarta.persistence.EntityManager;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;
import org.coderacer.backend.enums.Category;
import org.coderacer.backend.enums.Difficulty;
import org.coderacer.backend.enums.UserRole;
import org.coderacer.backend.model.CodeSnippet;
import org.coderacer.backend.model.SoloAttempt;
import org.coderacer.backend.model.User;
import org.coderacer.backend.support.AbstractPostgresIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.transaction.annotation.Transactional;

@Transactional
class SoloAttemptRepositoryTest extends AbstractPostgresIntegrationTest {

  @Autowired private SoloAttemptRepository soloAttemptRepository;
  @Autowired private UserRepository userRepository;
  @Autowired private CodeSnippetRepository codeSnippetRepository;
  @Autowired private EntityManager entityManager;

  private final Instant now = Instant.parse("2026-01-01T00:00:00Z");

  private User newUser(String username) {
    User user = new User();
    user.setEmail(username + "@example.com");
    user.setUsername(username);
    user.setPasswordHash("hashed-password");
    user.setRole(UserRole.USER);
    user.setEmailVerified(true);
    user.setDeleted(false);
    return user;
  }

  private CodeSnippet newSnippet(String source) {
    Category category = Category.JAVA;
    return codeSnippetRepository.save(
        new CodeSnippet("Title", source, sha256Hex(source), Difficulty.EASY, category));
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

  @Test
  void persistsAttemptWithUserAndSnippetRelations() {
    User user = userRepository.save(newUser("alice"));
    CodeSnippet snippet = newSnippet("hello");

    SoloAttempt saved =
        soloAttemptRepository.save(new SoloAttempt(user, snippet, Difficulty.EASY, now));

    SoloAttempt found = soloAttemptRepository.findById(saved.getId()).orElseThrow();
    assertThat(found.getUser().getId()).isEqualTo(user.getId());
    assertThat(found.getCodeSnippet().getId()).isEqualTo(snippet.getId());
    assertThat(found.getDifficulty()).isEqualTo(Difficulty.EASY);
  }

  @Test
  void enforcesOneActiveAttemptPerUserViaUniqueIndex() {
    User user = userRepository.save(newUser("bob"));
    CodeSnippet snippetOne = newSnippet("hello");
    CodeSnippet snippetTwo = newSnippet("world");

    soloAttemptRepository.saveAndFlush(new SoloAttempt(user, snippetOne, Difficulty.EASY, now));

    assertThrows(
        DataIntegrityViolationException.class,
        () ->
            soloAttemptRepository.saveAndFlush(
                new SoloAttempt(user, snippetTwo, Difficulty.EASY, now)));
  }

  @Test
  void allowsNewActiveAttemptAfterPreviousOneTerminates() {
    User user = userRepository.save(newUser("carol"));
    CodeSnippet snippetOne = newSnippet("hello");
    CodeSnippet snippetTwo = newSnippet("world");

    SoloAttempt first =
        soloAttemptRepository.saveAndFlush(new SoloAttempt(user, snippetOne, Difficulty.EASY, now));
    first.abandon();
    soloAttemptRepository.saveAndFlush(first);

    SoloAttempt second =
        soloAttemptRepository.saveAndFlush(new SoloAttempt(user, snippetTwo, Difficulty.EASY, now));

    assertThat(second.getId()).isNotNull();
  }

  @Test
  void nonFinisherAttemptsHaveNullMetrics() {
    User user = userRepository.save(newUser("dave"));
    CodeSnippet snippet = newSnippet("hello");

    SoloAttempt attempt =
        soloAttemptRepository.save(new SoloAttempt(user, snippet, Difficulty.EASY, now));
    attempt.abandon();
    soloAttemptRepository.save(attempt);
    entityManager.flush();
    entityManager.clear();

    SoloAttempt reloaded = soloAttemptRepository.findById(attempt.getId()).orElseThrow();
    assertThat(reloaded.getDurationMs()).isNull();
    assertThat(reloaded.getCpm()).isNull();
    assertThat(reloaded.getFinishedAt()).isNull();
  }

  @Test
  void detectsStaleUpdateViaOptimisticLocking() {
    User user = userRepository.save(newUser("erin"));
    CodeSnippet snippet = newSnippet("hello");
    SoloAttempt attempt =
        soloAttemptRepository.saveAndFlush(new SoloAttempt(user, snippet, Difficulty.EASY, now));

    entityManager.clear();
    SoloAttempt staleCopy = soloAttemptRepository.findById(attempt.getId()).orElseThrow();

    entityManager.clear();
    SoloAttempt freshCopy = soloAttemptRepository.findById(attempt.getId()).orElseThrow();
    freshCopy.abandon();
    soloAttemptRepository.saveAndFlush(freshCopy);

    staleCopy.abandon();
    assertThrows(
        ObjectOptimisticLockingFailureException.class,
        () -> soloAttemptRepository.saveAndFlush(staleCopy));
  }
}
