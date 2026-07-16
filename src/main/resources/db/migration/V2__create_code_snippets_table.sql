CREATE TABLE code_snippets (
    id UUID PRIMARY KEY,
    content TEXT NOT NULL,
    difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('EASY', 'MEDIUM', 'HARD')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
