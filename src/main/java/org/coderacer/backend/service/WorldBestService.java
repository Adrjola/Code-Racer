package org.coderacer.backend.service;

import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.coderacer.backend.dto.WorldBestResponse;
import org.coderacer.backend.model.SoloAttempt;
import org.coderacer.backend.repository.SoloAttemptRepository;
import org.coderacer.backend.repository.SoloAttemptSpecifications;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** The world-best time and cpm for one snippet, shown on the race intro screen. */
@Service
@RequiredArgsConstructor
public class WorldBestService {

  private final SoloAttemptRepository repository;

  @Transactional(readOnly = true)
  public WorldBestResponse forSnippet(UUID snippetId) {
    Specification<SoloAttempt> scope =
        Specification.where(SoloAttemptSpecifications.completed())
            .and(SoloAttemptSpecifications.nonDeletedUser())
            .and(SoloAttemptSpecifications.forSnippet(snippetId));

    Optional<SoloAttempt> fastest = findFirst(scope, SoloAttemptSpecifications.fastestTimeFirst());
    Optional<SoloAttempt> highestCpm =
        findFirst(scope, SoloAttemptSpecifications.highestCpmFirst());

    return new WorldBestResponse(
        highestCpm.map(SoloAttempt::getCpm).orElse(null),
        highestCpm.map(attempt -> attempt.getUser().getUsername()).orElse(null),
        fastest.map(SoloAttempt::getDurationMs).orElse(null),
        fastest.map(attempt -> attempt.getUser().getUsername()).orElse(null));
  }

  private Optional<SoloAttempt> findFirst(Specification<SoloAttempt> scope, Sort sort) {
    return repository.findAll(scope, PageRequest.of(0, 1, sort)).stream().findFirst();
  }
}
