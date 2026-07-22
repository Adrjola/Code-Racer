package org.coderacer.backend.repository;

import java.util.UUID;
import org.coderacer.backend.enums.Difficulty;
import org.coderacer.backend.enums.SoloAttemptState;
import org.coderacer.backend.model.SoloAttempt;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;

public final class SoloAttemptSpecifications {

  private SoloAttemptSpecifications() {}

  public static Specification<SoloAttempt> completed() {
    return (root, query, cb) -> cb.equal(root.get("state"), SoloAttemptState.COMPLETED);
  }

  public static Specification<SoloAttempt> nonDeletedUser() {
    return (root, query, cb) -> cb.isFalse(root.get("user").get("deleted"));
  }

  public static Specification<SoloAttempt> forDifficulty(Difficulty difficulty) {
    return (root, query, cb) -> cb.equal(root.get("difficulty"), difficulty);
  }

  public static Specification<SoloAttempt> forSnippet(UUID codeSnippetId) {
    return (root, query, cb) -> cb.equal(root.get("codeSnippet").get("id"), codeSnippetId);
  }

  public static Sort fastestTimeFirst() {
    return Sort.by(
        Sort.Order.asc("durationMs"), Sort.Order.asc("finishedAt"), Sort.Order.asc("user.id"));
  }

  public static Sort highestCpmFirst() {
    return Sort.by(Sort.Order.desc("cpm"), Sort.Order.asc("finishedAt"), Sort.Order.asc("user.id"));
  }
}
