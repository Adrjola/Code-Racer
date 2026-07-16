package org.coderacer.backend.soloattempt;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

import jakarta.persistence.EntityManager;
import java.time.Instant;
import org.coderacer.backend.AbstractPostgresIntegrationTest;
import org.coderacer.backend.soloattempt.model.CodeSnippet;
import org.coderacer.backend.soloattempt.model.Difficulty;
import org.coderacer.backend.soloattempt.model.SoloAttempt;
import org.coderacer.backend.soloattempt.repository.CodeSnippetRepository;
import org.coderacer.backend.soloattempt.repository.SoloAttemptRepository;
import org.coderacer.backend.user.model.User;
import org.coderacer.backend.user.model.UserRole;
import org.coderacer.backend.user.repository.UserRepository;
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
    user.setEnabled(true);
    user.setDeleted(false);
    return user;
  }

  @Test
  void persistsAttemptWithUserAndSnippetRelations() {
    User user = userRepository.save(newUser("alice"));
    CodeSnippet snippet = codeSnippetRepository.save(new CodeSnippet("hello", Difficulty.EASY));

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
    CodeSnippet snippetOne = codeSnippetRepository.save(new CodeSnippet("hello", Difficulty.EASY));
    CodeSnippet snippetTwo = codeSnippetRepository.save(new CodeSnippet("world", Difficulty.EASY));

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
    CodeSnippet snippetOne = codeSnippetRepository.save(new CodeSnippet("hello", Difficulty.EASY));
    CodeSnippet snippetTwo = codeSnippetRepository.save(new CodeSnippet("world", Difficulty.EASY));

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
    CodeSnippet snippet = codeSnippetRepository.save(new CodeSnippet("hello", Difficulty.EASY));

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
    CodeSnippet snippet = codeSnippetRepository.save(new CodeSnippet("hello", Difficulty.EASY));
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
