package org.coderacer.backend.soloattempt.service;

import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.coderacer.backend.common.error.FieldError;
import org.coderacer.backend.common.exception.ValidationException;
import org.coderacer.backend.snippet.model.Difficulty;
import org.coderacer.backend.soloattempt.dto.SoloAttemptResultResponse;
import org.coderacer.backend.soloattempt.mapper.SoloAttemptMapper;
import org.coderacer.backend.soloattempt.model.SoloAttemptState;
import org.coderacer.backend.soloattempt.repository.SoloAttemptRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class SoloAttemptHistoryService {

  private static final Set<String> SORTABLE_PROPERTIES =
      Set.of("startedAt", "finishedAt", "difficulty", "state");
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
    return repository
        .findHistory(
            userId,
            SoloAttemptState.terminalStates(),
            state,
            categoryId,
            difficulty,
            startedFrom,
            startedTo,
            deterministic(pageable))
        .map(mapper::toResultResponse);
  }

  private Pageable deterministic(Pageable pageable) {
    Sort sort = pageable.getSort().isSorted() ? pageable.getSort() : DEFAULT_SORT;
    sort.forEach(order -> requireSortable(order.getProperty()));
    return PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), sort.and(TIE_BREAKER));
  }

  private void requireSortable(String property) {
    if (!SORTABLE_PROPERTIES.contains(property)) {
      throw new ValidationException(
          "Validation failed",
          List.of(
              new FieldError(
                  "sort", "must be one of " + SORTABLE_PROPERTIES.stream().sorted().toList())));
    }
  }
}
