package org.coderacer.backend.service;

import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.coderacer.backend.dto.AdminUserResponse;
import org.coderacer.backend.enums.UserRole;
import org.coderacer.backend.exception.ConflictException;
import org.coderacer.backend.exception.ResourceNotFoundException;
import org.coderacer.backend.exception.SelfActionForbiddenException;
import org.coderacer.backend.mapper.UserMapper;
import org.coderacer.backend.model.User;
import org.coderacer.backend.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AdminUserService {

  private final UserRepository repository;
  private final UserMapper mapper;

  @Transactional(readOnly = true)
  public Page<AdminUserResponse> list(
      UserRole role, Boolean emailVerified, Boolean deleted, Pageable pageable) {
    return repository
        .findAll(withFilters(role, emailVerified, deleted), pageable)
        .map(mapper::toAdminResponse);
  }

  @Transactional(readOnly = true)
  public AdminUserResponse getById(UUID id) {
    return mapper.toAdminResponse(findOrThrow(id));
  }

  @Transactional
  public void delete(UUID id, UUID currentAdminId) {
    User user = findOrThrow(id);
    requireNotSelf(id, currentAdminId, "delete");
    if (user.isDeleted()) {
      throw new ConflictException("User is already deleted", "USER_ALREADY_DELETED");
    }
    user.setDeleted(true);
    repository.saveAndFlush(user);
  }

  @Transactional
  public AdminUserResponse restore(UUID id) {
    User user = findOrThrow(id);
    if (!user.isDeleted()) {
      throw new ConflictException("User is not deleted", "USER_NOT_DELETED");
    }
    user.setDeleted(false);
    return mapper.toAdminResponse(repository.saveAndFlush(user));
  }

  private void requireNotSelf(UUID targetId, UUID currentAdminId, String action) {
    if (targetId.equals(currentAdminId)) {
      throw new SelfActionForbiddenException("Admins cannot " + action + " their own account");
    }
  }

  private User findOrThrow(UUID id) {
    return repository
        .findById(id)
        .orElseThrow(() -> new ResourceNotFoundException("User with id " + id + " not found"));
  }

  private static Specification<User> withFilters(
      UserRole role, Boolean emailVerified, Boolean deleted) {
    return (root, query, cb) -> {
      List<Predicate> predicates = new ArrayList<>();
      if (role != null) {
        predicates.add(cb.equal(root.get("role"), role));
      }
      if (emailVerified != null) {
        predicates.add(cb.equal(root.get("emailVerified"), emailVerified));
      }
      if (deleted != null) {
        predicates.add(cb.equal(root.get("deleted"), deleted));
      }
      return cb.and(predicates.toArray(new Predicate[0]));
    };
  }
}
