alter table user_account
    add column username_normalized varchar(20);

update user_account
set username_normalized = lower(username);

alter table user_account
    alter column username_normalized set not null;

alter table user_account
    add constraint uq_user_account_username_normalized unique (username_normalized);
