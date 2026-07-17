package org.coderacer.backend.soloattempt.service;

import jakarta.persistence.criteria.Predicate;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.coderacer.backend.common.exception.ValidationException;
import org.coderacer.backend.snippet.model.Difficulty;
import org.coderacer.backend.soloattempt.dto.SoloAttemptResultResponse;
import org.coderacer.backend.soloattempt.mapper.SoloAttemptMapper;
import org.coderacer.backend.soloattempt.model.SoloAttempt;
import org.coderacer.backend.soloattempt.model.SoloAttemptState;
import org.coderacer.backend.soloattempt.repository.SoloAttemptRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class SoloAttemptHistoryService {

  private static final Sort DEFAULT_SORT = Sort.by(Sort.Direction.DESC, "startedAt");
  private static final Sort TIE_BREAKER = Sort.by(Sort.Direction.ASC, "id");

  private final SoloAttemptRepository repository;
  private final SoloAttemptMapper mapper;

  @Transactional(readOnly = true)
  public Page<SoloAttemptResultResponse> findHistory(
      UUID userId,
      SoloAttemptState state,
      UUID categoryId,
      Difficulty difficulty,
      Instant startedFrom,
      Instant startedTo,
      Pageable pageable) {
    if (state != null && !SoloAttemptState.terminalStates().contains(state)) {
      throw new ValidationException(
          "Validation failed: state must be one of " + SoloAttemptState.terminalStates());
    }

    Specification<SoloAttempt> specification =
        ownHistory(userId, state, categoryId, difficulty, startedFrom, startedTo);
    return repository.findAll(specification, deterministic(pageable)).map(mapper::toResultResponse);
  }

  private Specification<SoloAttempt> ownHistory(
      UUID userId,
      SoloAttemptState state,
      UUID categoryId,
      Difficulty difficulty,
      Instant startedFrom,
      Instant startedTo) {
    return (root, query, builder) -> {
      List<Predicate> predicates = new ArrayList<>();
      predicates.add(builder.equal(root.get("user").get("id"), userId));
      predicates.add(root.get("state").in(SoloAttemptState.terminalStates()));
      if (state != null) {
        predicates.add(builder.equal(root.get("state"), state));
      }
      if (categoryId != null) {
        predicates.add(
            builder.equal(root.get("codeSnippet").get("category").get("id"), categoryId));
      }
      if (difficulty != null) {
        predicates.add(builder.equal(root.get("difficulty"), difficulty));
      }
      if (startedFrom != null) {
        predicates.add(builder.greaterThanOrEqualTo(root.get("startedAt"), startedFrom));
      }
      if (startedTo != null) {
        predicates.add(builder.lessThanOrEqualTo(root.get("startedAt"), startedTo));
      }
      return builder.and(predicates.toArray(new Predicate[0]));
    };
  }

  private Pageable deterministic(Pageable pageable) {
    Sort sort = pageable.getSort().isSorted() ? pageable.getSort() : DEFAULT_SORT;
    return PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), sort.and(TIE_BREAKER));
  }
}
