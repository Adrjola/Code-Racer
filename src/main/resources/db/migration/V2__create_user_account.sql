create table user_account (
    id             uuid          primary key,
    email          varchar(254)  not null,
    username       varchar(30)   not null,
    password_hash  varchar(255)  not null,
    role           varchar(20)   not null,
    email_verified boolean       not null default false,
    enabled        boolean       not null default true,
    deleted        boolean       not null default false,
    created_at     timestamptz   not null,
    updated_at     timestamptz   not null,
    constraint uq_user_account_email unique (email),
    constraint uq_user_account_username unique (username),
    constraint chk_user_account_role check (role in ('USER', 'ADMIN'))
);
