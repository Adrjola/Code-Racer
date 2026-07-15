alter table user_account
    add column token_valid_after timestamptz not null default '1970-01-01 00:00:00+00';
