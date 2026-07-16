create table email_verification_token (
    id          uuid         primary key,
    user_id     uuid         not null,
    token_hash  varchar(64)  not null,
    expires_at  timestamptz  not null,
    used_at     timestamptz,
    revoked_at  timestamptz,
    created_at  timestamptz  not null,
    constraint fk_email_verification_token_user
        foreign key (user_id) references user_account(id) on delete cascade,
    constraint uq_email_verification_token_hash unique (token_hash),
    constraint chk_email_verification_token_hash_length check (char_length(token_hash) = 64)
);

create index idx_email_verification_token_user_id
    on email_verification_token(user_id);

create index idx_email_verification_token_expires_at
    on email_verification_token(expires_at);

create index idx_email_verification_token_user_active
    on email_verification_token(user_id)
    where used_at is null and revoked_at is null;
