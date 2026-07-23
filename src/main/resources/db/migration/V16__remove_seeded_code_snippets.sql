-- The three snippets seeded by V9 were only ever scaffolding for development.
-- Production starts empty and admins add the real catalogue themselves.
--
-- V9 cannot simply be deleted: it has already run on every existing database,
-- and removing it would fail Flyway validation on all of them.

-- A snippet nobody has raced on can go for good.
delete from code_snippet
where id in (
    '2d357563-9706-43b0-b11e-e4ab2f77b1d1',
    '094f4d07-dcf8-4fc3-b2c7-687b7d6f4707',
    'fbab83aa-e7b5-4c42-91b3-3394f2f291ef'
)
and not exists (
    select 1
    from solo_attempts
    where solo_attempts.code_snippet_id = code_snippet.id
);

-- Any that survive are referenced by a finished race, so they are soft deleted
-- instead: hidden from players, with the attempt history left intact. This is
-- exactly what deleting a snippet from the admin catalogue does.
update code_snippet
set lifecycle = 'DELETED',
    updated_at = now()
where id in (
    '2d357563-9706-43b0-b11e-e4ab2f77b1d1',
    '094f4d07-dcf8-4fc3-b2c7-687b7d6f4707',
    'fbab83aa-e7b5-4c42-91b3-3394f2f291ef'
);
