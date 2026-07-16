create table code_snippet (
    id              uuid           primary key,
    snippet_id      uuid           not null,
    revision_number int            not null,
    title           varchar(200)   not null,
    source          varchar(10000) not null,
    content_hash    varchar(64)    not null,
    difficulty      varchar(20)    not null,
    lifecycle       varchar(20)    not null,
    category_id     uuid             not null,
    selection_key   double precision not null default random(),
    created_at      timestamptz      not null,
    updated_at      timestamptz      not null,
    version         bigint           not null,
    constraint fk_code_snippet_category foreign key (category_id) references category (id),
    constraint uq_code_snippet_revision unique (snippet_id, revision_number),
    constraint chk_code_snippet_revision_number check (revision_number > 0),
    constraint chk_code_snippet_content_hash check (content_hash ~ '^[0-9a-f]{64}$'),
    constraint chk_code_snippet_selection_key check (selection_key >= 0 and selection_key < 1),
    constraint chk_code_snippet_difficulty check (difficulty in ('EASY', 'MEDIUM', 'HARD')),
    constraint chk_code_snippet_lifecycle check (lifecycle in ('ACTIVE', 'INACTIVE', 'RETIRED', 'DELETED'))
);

create unique index uq_code_snippet_active_content_hash
    on code_snippet (content_hash)
    where lifecycle = 'ACTIVE';

create index idx_code_snippet_snippet_revision
    on code_snippet (snippet_id, revision_number desc);

create index idx_code_snippet_lifecycle
    on code_snippet (lifecycle);

create index idx_code_snippet_active_selection
    on code_snippet (category_id, difficulty, selection_key)
    include (content_hash, id)
    where lifecycle = 'ACTIVE';
