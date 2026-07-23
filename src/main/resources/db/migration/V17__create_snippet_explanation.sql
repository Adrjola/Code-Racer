CREATE TABLE snippet_explanation (
    id              UUID PRIMARY KEY,
    snippet_id      UUID NOT NULL UNIQUE REFERENCES code_snippet(id),
    summary         VARCHAR(2000) NOT NULL,
    step_by_step    TEXT NOT NULL,
    concepts        TEXT NOT NULL,
    best_practices  TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
