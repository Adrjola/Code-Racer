alter table code_snippet add column category varchar(30);

-- The catalog only ever held the seeded "Algorithms" row and its snippets are all
-- Java exercises, so every existing snippet lands on JAVA.
update code_snippet set category = 'JAVA' where category is null;

alter table code_snippet alter column category set not null;
alter table code_snippet
    add constraint chk_code_snippet_category
        check (category in ('JAVA', 'REST_APIS', 'SQL', 'TESTING'));

-- Dropping the column takes idx_code_snippet_active_selection with it, so the
-- random-snippet lookup gets the same index over the new column.
alter table code_snippet drop column category_id;

create index idx_code_snippet_active_selection
    on code_snippet (category, difficulty, selection_key)
    include (content_hash, id)
    where lifecycle = 'ACTIVE';

drop table category;
