CREATE TABLE solo_attempts (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    code_snippet_id UUID NOT NULL REFERENCES code_snippets(id),
    state VARCHAR(20) NOT NULL CHECK (state IN ('COUNTDOWN', 'ACTIVE', 'COMPLETED', 'ABANDONED', 'EXPIRED', 'INVALIDATED')),
    difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('EASY', 'MEDIUM', 'HARD')),
    started_at TIMESTAMPTZ NOT NULL,
    finished_at TIMESTAMPTZ NULL,
    duration_ms BIGINT NULL,
    cpm INT NULL,
    version BIGINT NOT NULL DEFAULT 0,
    CHECK (finished_at IS NULL OR finished_at >= started_at)
);

CREATE INDEX idx_solo_attempts_user_id ON solo_attempts (user_id);
CREATE INDEX idx_solo_attempts_user_id_state ON solo_attempts (user_id, state);
CREATE INDEX idx_solo_attempts_user_id_state_difficulty ON solo_attempts (user_id, state, difficulty);
CREATE UNIQUE INDEX idx_one_active_attempt_per_user ON solo_attempts (user_id) WHERE state IN ('COUNTDOWN', 'ACTIVE');
