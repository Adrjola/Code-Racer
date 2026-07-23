package org.coderacer.backend.dto;

import java.util.List;

public record ExplanationResponse(
    String summary, List<String> stepByStep, List<String> concepts, List<String> bestPractices) {

  public static final int MAX_SUMMARY_LENGTH = 2000;
  public static final int MAX_SECTION_ITEMS = 20;
  public static final int MAX_ITEM_LENGTH = 1000;

  public boolean isValid() {
    return isNotBlank(summary)
        && summary.length() <= MAX_SUMMARY_LENGTH
        && isValidSection(stepByStep)
        && isValidSection(concepts)
        && isValidSection(bestPractices);
  }

  private boolean isNotBlank(String value) {
    return value != null && !value.isBlank();
  }

  private boolean isValidSection(List<String> section) {
    if (section == null || section.isEmpty()) {
      return false;
    }
    if (section.size() > MAX_SECTION_ITEMS) {
      return false;
    }
    return section.stream().allMatch(item -> isNotBlank(item) && item.length() <= MAX_ITEM_LENGTH);
  }
}
