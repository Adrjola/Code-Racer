-- Live typing progress used to live in a ConcurrentHashMap, so a backend
-- restart mid-race left the attempt ACTIVE with no way to score it. Storing it
-- on the row makes the state survive a restart and stay correct if the backend
-- ever runs more than one instance.
ALTER TABLE solo_attempts
    ADD COLUMN accepted_offset INT NOT NULL DEFAULT 0,
    ADD COLUMN last_sequence BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN last_progress_at TIMESTAMPTZ NULL;

ALTER TABLE solo_attempts
    ADD CONSTRAINT chk_solo_attempts_accepted_offset_non_negative CHECK (accepted_offset >= 0),
    ADD CONSTRAINT chk_solo_attempts_last_sequence_non_negative CHECK (last_sequence >= 0);
