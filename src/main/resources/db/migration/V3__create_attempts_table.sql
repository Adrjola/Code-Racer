CREATE TABLE attempts (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    code_snippet_id UUID NOT NULL REFERENCES code_snippets(id),
    state VARCHAR(20) NOT NULL CHECK (STATE IN 'STARTED', 'COMPLETED', 'ABANDONED'),
    started_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP NULL CHECK(completed_at IS NULL, completed_at >= started_at),
    duration_ms BIGINT NULL,
    total_characters INT NOT NULL,
    accepted_character_count INT NOT NULL,
    cpm INT NULL, ACCURACY NUMERIC(5, 2) NULL,
);

CREATE INDEX idx_attempts_user_id ON attempts(user_id);
CREATE INDEX idx_attempts_user_id_state ON attempts(user_id, state);