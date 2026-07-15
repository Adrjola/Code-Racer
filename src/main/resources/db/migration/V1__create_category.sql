create table category (
    id          uuid          primary key,
    name        varchar(100)  not null unique,
    description varchar(500),
    active      boolean       not null default true,
    created_at  timestamptz   not null,
    updated_at  timestamptz   not null
);
