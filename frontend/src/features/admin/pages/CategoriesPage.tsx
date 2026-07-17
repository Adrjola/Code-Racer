import { useEffect, useState } from 'react';
import Badge from '@/components/Badge';
import Button from '@/components/Button';
import ConfirmDialog from '@/components/ConfirmDialog';
import Pagination from '@/components/Pagination';
import {
  createCategory,
  deleteCategory,
  listCategories,
  restoreCategory,
  updateCategory,
  type Category,
  type CategoryValues,
} from '@/features/admin/api';
import CategoryFormDialog from '@/features/admin/components/CategoryFormDialog';
import { readableAdminError } from '@/features/admin/errors';
import type { Page } from '@/lib/apiClient';

type Dialog =
  | { category: Category; type: 'disable' | 'edit' | 'restore' }
  | { type: 'create' }
  | null;

const PAGE_SIZE = 10;

const cardClassName =
  'flex flex-col gap-3 rounded-[10px] border border-pink-400/15 bg-white/[0.02] p-4 md:flex-row md:items-center md:justify-between';

export default function CategoriesPage() {
  const [page, setPage] = useState(0);
  const [reloadToken, setReloadToken] = useState(0);
  const [data, setData] = useState<Page<Category> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [dialogError, setDialogError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Guards against a slow response for an abandoned page overwriting a newer one.
    let active = true;

    const load = async () => {
      try {
        const result = await listCategories({ page, size: PAGE_SIZE });
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
  }, [page, reloadToken]);

  const reload = () => {
    setIsLoading(true);
    setReloadToken((token) => token + 1);
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

  const handleSubmit = (values: CategoryValues) =>
    run(() =>
      dialog?.type === 'edit'
        ? updateCategory(dialog.category.id, values)
        : createCategory(values),
    );

  const handleLifecycle = () => {
    if (dialog?.type === 'disable') {
      const { id } = dialog.category;
      return run(() => deleteCategory(id));
    }
    if (dialog?.type === 'restore') {
      const { id } = dialog.category;
      return run(() => restoreCategory(id));
    }
  };

  const categories = data?.content ?? [];

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-text-primary">
            Categories
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            Group snippets by topic. Disabled categories cannot be chosen for
            new or edited snippets.
          </p>
        </div>
        <Button
          onClick={() => openDialog({ type: 'create' })}
          variant="primary"
        >
          New category
        </Button>
      </div>

      <div aria-live="polite" className="mt-6">
        {isLoading && (
          <p className="text-sm text-text-muted">Loading categories...</p>
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

        {!isLoading && !loadError && categories.length === 0 && (
          <p className="rounded-[10px] border border-white/10 bg-white/[0.02] p-6 text-center text-sm text-text-muted">
            No categories yet. Create the first one to start adding snippets.
          </p>
        )}

        {!isLoading && !loadError && categories.length > 0 && (
          <ul className="flex flex-col gap-3">
            {categories.map((category) => (
              <li className={cardClassName} key={category.id}>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-text-primary">
                      {category.name}
                    </h3>
                    <Badge tone={category.active ? 'positive' : 'muted'}>
                      {category.active ? 'Active' : 'Disabled'}
                    </Badge>
                  </div>
                  {category.description && (
                    <p className="mt-1 text-sm text-text-secondary">
                      {category.description}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    onClick={() => openDialog({ category, type: 'edit' })}
                  >
                    Edit
                  </Button>
                  {category.active ? (
                    <Button
                      onClick={() => openDialog({ category, type: 'disable' })}
                      variant="danger"
                    >
                      Disable
                    </Button>
                  ) : (
                    <Button
                      onClick={() => openDialog({ category, type: 'restore' })}
                    >
                      Restore
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
        <CategoryFormDialog
          category={dialog.type === 'edit' ? dialog.category : undefined}
          error={dialogError}
          isSubmitting={isSubmitting}
          onCancel={() => setDialog(null)}
          onSubmit={handleSubmit}
        />
      )}

      {dialog?.type === 'disable' && (
        <ConfirmDialog
          confirmLabel="Disable"
          confirmVariant="danger"
          description={`"${dialog.category.name}" stays on the snippets already using it, but nobody can pick it for new or edited snippets until it is restored.`}
          error={dialogError}
          isSubmitting={isSubmitting}
          onCancel={() => setDialog(null)}
          onConfirm={handleLifecycle}
          title="Disable category"
        />
      )}

      {dialog?.type === 'restore' && (
        <ConfirmDialog
          confirmLabel="Restore"
          description={`"${dialog.category.name}" becomes selectable for snippets again.`}
          error={dialogError}
          isSubmitting={isSubmitting}
          onCancel={() => setDialog(null)}
          onConfirm={handleLifecycle}
          title="Restore category"
        />
      )}
    </section>
  );
}
