package org.coderacer.backend.service;

import org.coderacer.backend.dto.ExplanationResponse;

public interface AiProvider {

  ExplanationResponse explain(String snippetSource);
}
