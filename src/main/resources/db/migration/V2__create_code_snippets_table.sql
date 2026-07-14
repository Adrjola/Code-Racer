CREATE TABLE code_snippets (
    id UUID PRIMARY KEY,
    content TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
);