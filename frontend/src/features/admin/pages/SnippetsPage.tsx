import { useEffect, useState } from 'react';
import Badge, { type BadgeTone } from '@/components/Badge';
import Button from '@/components/Button';
import ConfirmDialog from '@/components/ConfirmDialog';
import Pagination from '@/components/Pagination';
import SelectField from '@/components/SelectField';
import {
  activateSnippet,
  createSnippet,
  deactivateSnippet,
  deleteSnippet,
  listCategories,
  listSnippets,
  restoreSnippet,
  updateSnippet,
  type Category,
  type Difficulty,
  type Snippet,
  type SnippetLifecycle,
  type SnippetValues,
} from '@/features/admin/api';
import SnippetFormDialog from '@/features/admin/components/SnippetFormDialog';
import { readableAdminError } from '@/features/admin/errors';
import type { Page } from '@/lib/apiClient';

type Dialog =
  | {
      snippet: Snippet;
      type: 'activate' | 'deactivate' | 'delete' | 'edit' | 'restore';
    }
  | { type: 'create' }
  | null;

const PAGE_SIZE = 10;
const CATEGORY_FETCH_SIZE = 100;

const LIFECYCLE_TONE: Record<SnippetLifecycle, BadgeTone> = {
  ACTIVE: 'positive',
  DELETED: 'danger',
  INACTIVE: 'muted',
  RETIRED: 'neutral',
};

const LIFECYCLE_LABEL: Record<SnippetLifecycle, string> = {
  ACTIVE: 'Active',
  DELETED: 'Deleted',
  INACTIVE: 'Inactive',
  RETIRED: 'Retired',
};

const cardClassName =
  'flex flex-col gap-3 rounded-[10px] border border-pink-400/15 bg-white/[0.02] p-4 lg:flex-row lg:items-start lg:justify-between';

const difficultyOptions = (['EASY', 'MEDIUM', 'HARD'] as Difficulty[]).map(
  (difficulty) => ({
    label: `${difficulty.charAt(0)}${difficulty.slice(1).toLowerCase()}`,
    value: difficulty,
  }),
);

const lifecycleOptions = (
  ['ACTIVE', 'INACTIVE', 'RETIRED', 'DELETED'] as SnippetLifecycle[]
).map((lifecycle) => ({ label: LIFECYCLE_LABEL[lifecycle], value: lifecycle }));

export default function SnippetsPage() {
  const [page, setPage] = useState(0);
  const [reloadToken, setReloadToken] = useState(0);
  const [categoryId, setCategoryId] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [lifecycle, setLifecycle] = useState('');
  const [data, setData] = useState<Page<Snippet> | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [dialogError, setDialogError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const result = await listSnippets(
          {
            categoryId: categoryId || undefined,
            difficulty: (difficulty as Difficulty) || undefined,
            lifecycle: (lifecycle as SnippetLifecycle) || undefined,
          },
          { page, size: PAGE_SIZE },
        );
        if (!active) {
          return;
        }
        setData(result);
        setLoadError(undefined);
      } catch (error) {
        if (active) {
          setLoadError(readableAdminError(error));
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [categoryId, difficulty, lifecycle, page, reloadToken]);

  useEffect(() => {
    let active = true;

    const loadCategories = async () => {
      // Filters and the category picker degrade quietly if this list fails.
      const result = await listCategories({
        size: CATEGORY_FETCH_SIZE,
      }).catch(() => null);

      if (active && result) {
        setCategories(result.content);
      }
    };

    void loadCategories();
    return () => {
      active = false;
    };
  }, [reloadToken]);

  const reload = () => {
    setIsLoading(true);
    setReloadToken((token) => token + 1);
  };

  const applyFilter = (apply: () => void) => {
    setIsLoading(true);
    setPage(0);
    apply();
  };

  const goToPage = (next: number) => {
    setIsLoading(true);
    setPage(next);
  };

  const openDialog = (next: Dialog) => {
    setDialogError(undefined);
    setDialog(next);
  };

  const run = async (action: () => Promise<unknown>) => {
    setIsSubmitting(true);
    setDialogError(undefined);
    try {
      await action();
      setDialog(null);
      reload();
    } catch (error) {
      setDialogError(readableAdminError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (values: SnippetValues) => {
    if (dialog?.type !== 'edit') {
      return run(async () => {
        await createSnippet(values);
        setNotice('Snippet created.');
      });
    }

    const current = dialog.snippet;
    return run(async () => {
      const saved = await updateSnippet(current.id, values, current.version);
      setNotice(
        saved.id === current.id
          ? `Saved revision ${saved.revisionNumber}.`
          : `Created revision ${saved.revisionNumber}. Revision ${current.revisionNumber} is now retired.`,
      );
    });
  };

  const handleLifecycle = () => {
    if (!dialog || dialog.type === 'create' || dialog.type === 'edit') {
      return;
    }

    const { snippet, type } = dialog;
    return run(async () => {
      if (type === 'activate') {
        await activateSnippet(snippet.id);
        setNotice(`Revision ${snippet.revisionNumber} is now active.`);
      } else if (type === 'deactivate') {
        await deactivateSnippet(snippet.id);
        setNotice(`Revision ${snippet.revisionNumber} is now inactive.`);
      } else if (type === 'restore') {
        await restoreSnippet(snippet.id);
        setNotice(
          `Revision ${snippet.revisionNumber} was restored as inactive.`,
        );
      } else {
        await deleteSnippet(snippet.id);
        setNotice(`Revision ${snippet.revisionNumber} was deleted.`);
      }
    });
  };

  const categoryName = (id: string) =>
    categories.find((category) => category.id === id)?.name ??
    'Unknown category';

  const snippets = data?.content ?? [];
  const editing = dialog?.type === 'edit' ? dialog.snippet : undefined;

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-text-primary">
            Snippets
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            Editing the code, difficulty, or category creates a new revision and
            retires the old one, so past results stay accurate.
          </p>
        </div>
        <Button
          onClick={() => openDialog({ type: 'create' })}
          variant="primary"
        >
          New snippet
        </Button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <SelectField
          id="filter-category"
          label="Category"
          onChange={(value) => applyFilter(() => setCategoryId(value))}
          options={categories.map((category) => ({
            label: category.name,
            value: category.id,
          }))}
          placeholder="All categories"
          value={categoryId}
        />
        <SelectField
          id="filter-difficulty"
          label="Difficulty"
          onChange={(value) => applyFilter(() => setDifficulty(value))}
          options={difficultyOptions}
          placeholder="All difficulties"
          value={difficulty}
        />
        <SelectField
          id="filter-lifecycle"
          label="Status"
          onChange={(value) => applyFilter(() => setLifecycle(value))}
          options={lifecycleOptions}
          placeholder="All statuses"
          value={lifecycle}
        />
      </div>

      {notice && (
        <p
          className="mt-6 rounded-[8px] border border-pink-400/25 bg-pink-400/10 px-3 py-2 text-sm text-text-secondary"
          role="status"
        >
          {notice}
        </p>
      )}

      <div aria-live="polite" className="mt-6">
        {isLoading && (
          <p className="text-sm text-text-muted">Loading snippets...</p>
        )}

        {!isLoading && loadError && (
          <div
            className="rounded-[10px] border border-red-400/25 bg-red-400/10 p-4"
            role="alert"
          >
            <p className="text-sm text-red-300">{loadError}</p>
            <Button className="mt-3" onClick={reload}>
              Try again
            </Button>
          </div>
        )}

        {!isLoading && !loadError && snippets.length === 0 && (
          <p className="rounded-[10px] border border-white/10 bg-white/[0.02] p-6 text-center text-sm text-text-muted">
            No snippets match these filters.
          </p>
        )}

        {!isLoading && !loadError && snippets.length > 0 && (
          <ul className="flex flex-col gap-3">
            {snippets.map((snippet) => (
              <li className={cardClassName} key={snippet.id}>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-text-primary">
                      {snippet.title}
                    </h3>
                    <Badge tone={LIFECYCLE_TONE[snippet.lifecycle]}>
                      {LIFECYCLE_LABEL[snippet.lifecycle]}
                    </Badge>
                    <Badge tone="muted">Rev {snippet.revisionNumber}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-text-muted">
                    {categoryName(snippet.categoryId)} -{' '}
                    {snippet.difficulty.charAt(0)}
                    {snippet.difficulty.slice(1).toLowerCase()}
                  </p>
                  <pre className="mt-2 max-h-24 overflow-hidden whitespace-pre-wrap break-words font-mono text-xs text-text-secondary">
                    {snippet.source}
                  </pre>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {(snippet.lifecycle === 'ACTIVE' ||
                    snippet.lifecycle === 'INACTIVE') && (
                    <Button
                      onClick={() => openDialog({ snippet, type: 'edit' })}
                    >
                      Edit
                    </Button>
                  )}
                  {snippet.lifecycle === 'INACTIVE' && (
                    <Button
                      onClick={() => openDialog({ snippet, type: 'activate' })}
                    >
                      Activate
                    </Button>
                  )}
                  {snippet.lifecycle === 'ACTIVE' && (
                    <Button
                      onClick={() =>
                        openDialog({ snippet, type: 'deactivate' })
                      }
                    >
                      Deactivate
                    </Button>
                  )}
                  {snippet.lifecycle === 'DELETED' ? (
                    <Button
                      onClick={() => openDialog({ snippet, type: 'restore' })}
                    >
                      Restore
                    </Button>
                  ) : (
                    <Button
                      onClick={() => openDialog({ snippet, type: 'delete' })}
                      variant="danger"
                    >
                      Delete
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {!isLoading && !loadError && data && data.page.totalPages > 1 && (
        <div className="mt-6">
          <Pagination
            onPageChange={goToPage}
            page={page}
            totalElements={data.page.totalElements}
            totalPages={data.page.totalPages}
          />
        </div>
      )}

      {(dialog?.type === 'create' || dialog?.type === 'edit') && (
        <SnippetFormDialog
          categories={categories}
          error={dialogError}
          isSubmitting={isSubmitting}
          onCancel={() => setDialog(null)}
          onSubmit={handleSubmit}
          snippet={editing}
        />
      )}

      {dialog?.type === 'activate' && (
        <ConfirmDialog
          confirmLabel="Activate"
          description={`Revision ${dialog.snippet.revisionNumber} of "${dialog.snippet.title}" becomes available for new races.`}
          error={dialogError}
          isSubmitting={isSubmitting}
          onCancel={() => setDialog(null)}
          onConfirm={handleLifecycle}
          title="Activate revision"
        />
      )}

      {dialog?.type === 'deactivate' && (
        <ConfirmDialog
          confirmLabel="Deactivate"
          description={`Revision ${dialog.snippet.revisionNumber} of "${dialog.snippet.title}" stops appearing in new races. Past results are unaffected.`}
          error={dialogError}
          isSubmitting={isSubmitting}
          onCancel={() => setDialog(null)}
          onConfirm={handleLifecycle}
          title="Deactivate revision"
        />
      )}

      {dialog?.type === 'delete' && (
        <ConfirmDialog
          confirmLabel="Delete"
          confirmVariant="danger"
          description={`Revision ${dialog.snippet.revisionNumber} of "${dialog.snippet.title}" is removed from the catalog. Past results keep pointing at it, and you can restore it later.`}
          error={dialogError}
          isSubmitting={isSubmitting}
          onCancel={() => setDialog(null)}
          onConfirm={handleLifecycle}
          title="Delete revision"
        />
      )}

      {dialog?.type === 'restore' && (
        <ConfirmDialog
          confirmLabel="Restore"
          description={`Revision ${dialog.snippet.revisionNumber} of "${dialog.snippet.title}" comes back as inactive. Activate it when you want it raced again.`}
          error={dialogError}
          isSubmitting={isSubmitting}
          onCancel={() => setDialog(null)}
          onConfirm={handleLifecycle}
          title="Restore revision"
        />
      )}
    </section>
  );
}
