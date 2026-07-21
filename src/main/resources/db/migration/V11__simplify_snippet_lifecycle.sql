-- Snippets are now immutable: no editing, no revisions, and the only lifecycle
-- change is a one-way soft delete.

-- Existing INACTIVE/RETIRED rows have no meaning under the new rules. RETIRED
-- rows were superseded by an edit and INACTIVE ones were hidden by an admin, so
-- both become DELETED: still readable in the admin catalog, hidden from players.
update code_snippet
set lifecycle = 'DELETED'
where lifecycle in ('INACTIVE', 'RETIRED');

alter table code_snippet
    drop constraint chk_code_snippet_lifecycle;

alter table code_snippet
    add constraint chk_code_snippet_lifecycle
        check (lifecycle in ('ACTIVE', 'DELETED'));

-- Revision identity is gone; each row is now a standalone snippet.
drop index if exists idx_code_snippet_snippet_revision;

alter table code_snippet
    drop constraint uq_code_snippet_revision,
    drop constraint chk_code_snippet_revision_number;

alter table code_snippet
    drop column snippet_id,
    drop column revision_number;
