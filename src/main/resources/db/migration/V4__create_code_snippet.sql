create table code_snippet (
    id              uuid           primary key,
    snippet_id      uuid           not null,
    revision_number int            not null,
    title           varchar(200)   not null,
    source          varchar(10000) not null,
    content_hash    varchar(64)    not null,
    difficulty      varchar(20)    not null,
    lifecycle       varchar(20)    not null,
    category_id     uuid           not null references category (id),
    created_at      timestamptz    not null,
    updated_at      timestamptz    not null,
    version         bigint         not null,
    unique (snippet_id, revision_number)
);
