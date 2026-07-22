import { useEffect, useState } from 'react';
import type { Page } from '@/lib/apiClient';
import Badge from '@/components/Badge';
import Button from '@/components/Button';
import ConfirmDialog from '@/components/ConfirmDialog';
import { EyeIcon } from '@/components/icons';
import Modal from '@/components/Modal';
import Pagination from '@/components/Pagination';
import SelectField from '@/components/SelectField';
import UserEditDialog from '@/features/admin/users/components/UserEditDialog';
import { readableAdminError } from '@/features/admin/errors';
import {
  deleteUser,
  listUsers,
  restoreUser,
  updateUser,
  type AdminUser,
  type AdminUserEditValues,
  type AdminUserFilters,
  type UserRole,
} from '@/features/admin/users/usersApi';
import type { AuthSession } from '@/features/auth/session';

type Dialog =
  | { user: AdminUser; type: 'delete' }
  | { user: AdminUser; type: 'edit' }
  | { user: AdminUser; type: 'restore' }
  | { user: AdminUser; type: 'view' }
  | null;

const PAGE_SIZE = 10;

const cardClassName =
  'flex flex-col gap-3 rounded-[10px] border border-pink-400/15 bg-white/[0.02] p-4 lg:flex-row lg:items-start lg:justify-between';

const roleOptions: { label: string; value: UserRole }[] = [
  { label: 'User', value: 'USER' },
  { label: 'Admin', value: 'ADMIN' },
];

const verifiedOptions = [
  { label: 'Verified', value: 'true' },
  { label: 'Unverified', value: 'false' },
];

const statusOptions = [
  { label: 'Active', value: 'false' },
  { label: 'Deleted', value: 'true' },
];

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

type UsersPageProps = {
  session: AuthSession;
};

export default function UsersPage({ session }: UsersPageProps) {
  const [page, setPage] = useState(0);
  const [reloadToken, setReloadToken] = useState(0);
  const [role, setRole] = useState('');
  const [emailVerified, setEmailVerified] = useState('');
  const [deleted, setDeleted] = useState('');
  const [data, setData] = useState<Page<AdminUser> | null>(null);
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
        const filters: AdminUserFilters = {
          deleted: deleted === '' ? undefined : deleted === 'true',
          emailVerified:
            emailVerified === '' ? undefined : emailVerified === 'true',
          role: (role as UserRole) || undefined,
        };
        const result = await listUsers(filters, { page, size: PAGE_SIZE });
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
  }, [deleted, emailVerified, page, reloadToken, role]);

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

  const closeDialog = () => {
    setDialog(null);
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
      // The target user may have changed or vanished since the list was
      // fetched, so refresh the list under the dialog to stay in sync.
      reload();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (dialog?.type !== 'delete') {
      return;
    }
    const { user } = dialog;
    return run(async () => {
      await deleteUser(user.id);
      setNotice(`"${user.username}" was deleted.`);
    });
  };

  const handleRestore = () => {
    if (dialog?.type !== 'restore') {
      return;
    }
    const { user } = dialog;
    return run(async () => {
      await restoreUser(user.id);
      setNotice(`"${user.username}" was restored.`);
    });
  };

  const handleEdit = (values: AdminUserEditValues) => {
    if (dialog?.type !== 'edit') {
      return;
    }
    const { user } = dialog;
    return run(async () => {
      await updateUser(user.id, values);
      setNotice(`"${user.username}" was updated.`);
    });
  };

  const users = data?.content ?? [];

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-text-primary">Users</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Deleting a user hides their account without erasing history;
            restoring reverses it.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <SelectField
          id="filter-role"
          label="Role"
          onChange={(value) => applyFilter(() => setRole(value))}
          options={roleOptions}
          placeholder="All roles"
          value={role}
        />
        <SelectField
          id="filter-verified"
          label="Verification"
          onChange={(value) => applyFilter(() => setEmailVerified(value))}
          options={verifiedOptions}
          placeholder="All"
          value={emailVerified}
        />
        <SelectField
          id="filter-status"
          label="Status"
          onChange={(value) => applyFilter(() => setDeleted(value))}
          options={statusOptions}
          placeholder="All"
          value={deleted}
        />
      </div>

      {notice && (
        <output className="mt-6 block rounded-[8px] border border-pink-400/25 bg-pink-400/10 px-3 py-2 text-sm text-text-secondary">
          {notice}
        </output>
      )}

      <div aria-live="polite" className="mt-6">
        {isLoading && (
          <p className="text-sm text-text-muted">Loading users...</p>
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

        {!isLoading && !loadError && users.length === 0 && (
          <p className="rounded-[10px] border border-white/10 bg-white/[0.02] p-6 text-center text-sm text-text-muted">
            No users match these filters.
          </p>
        )}

        {!isLoading && !loadError && users.length > 0 && (
          <ul className="flex flex-col gap-3">
            {users.map((user) => {
              const isSelf = user.id === session.user.id;
              return (
                <li className={cardClassName} key={user.id}>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-text-primary">
                        {user.username}
                      </h3>
                      <Badge tone={user.emailVerified ? 'positive' : 'muted'}>
                        {user.emailVerified ? 'Verified' : 'Unverified'}
                      </Badge>
                      <Badge tone={user.deleted ? 'danger' : 'positive'}>
                        {user.deleted ? 'Deleted' : 'Active'}
                      </Badge>
                      {user.role === 'ADMIN' && (
                        <Badge tone="neutral">Admin</Badge>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-text-muted">{user.email}</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button onClick={() => openDialog({ type: 'view', user })}>
                      <EyeIcon className="mr-2 size-4" />
                      View
                    </Button>
                    <Button onClick={() => openDialog({ type: 'edit', user })}>
                      Edit
                    </Button>
                    {!user.deleted && !isSelf && (
                      <Button
                        onClick={() => openDialog({ type: 'delete', user })}
                        variant="danger"
                      >
                        Delete
                      </Button>
                    )}
                    {user.deleted && (
                      <Button
                        onClick={() => openDialog({ type: 'restore', user })}
                        variant="primary"
                      >
                        Restore
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
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

      {dialog?.type === 'view' && (
        <Modal
          description={dialog.user.email}
          onClose={closeDialog}
          title={dialog.user.username}
        >
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-text-muted">Role</dt>
            <dd className="text-text-primary">{dialog.user.role}</dd>
            <dt className="text-text-muted">Verification</dt>
            <dd className="text-text-primary">
              {dialog.user.emailVerified ? 'Verified' : 'Unverified'}
            </dd>
            <dt className="text-text-muted">Status</dt>
            <dd className="text-text-primary">
              {dialog.user.deleted ? 'Deleted' : 'Active'}
            </dd>
            <dt className="text-text-muted">Created</dt>
            <dd className="text-text-primary">
              {formatDate(dialog.user.createdAt)}
            </dd>
            <dt className="text-text-muted">Updated</dt>
            <dd className="text-text-primary">
              {formatDate(dialog.user.updatedAt)}
            </dd>
          </dl>
        </Modal>
      )}

      {dialog?.type === 'edit' && (
        <UserEditDialog
          error={dialogError}
          isSubmitting={isSubmitting}
          onCancel={closeDialog}
          onSubmit={handleEdit}
          user={dialog.user}
        />
      )}

      {dialog?.type === 'delete' && (
        <ConfirmDialog
          confirmLabel="Delete"
          confirmVariant="danger"
          description={`"${dialog.user.username}" will be hidden and unable to log in. This can be undone by restoring the account.`}
          error={dialogError}
          isSubmitting={isSubmitting}
          onCancel={closeDialog}
          onConfirm={handleDelete}
          title="Delete user"
        />
      )}

      {dialog?.type === 'restore' && (
        <ConfirmDialog
          confirmLabel="Restore"
          confirmVariant="primary"
          description={`"${dialog.user.username}" will be able to log in again.`}
          error={dialogError}
          isSubmitting={isSubmitting}
          onCancel={closeDialog}
          onConfirm={handleRestore}
          title="Restore user"
        />
      )}
    </section>
  );
}
