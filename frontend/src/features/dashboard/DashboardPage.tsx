import Logo from '@/components/Logo';
import AdminCatalogPage from '@/features/admin/pages/AdminCatalogPage';
import type { AuthSession } from '@/features/auth/session';

type DashboardPageProps = {
  notice?: string;
  onGoAdmin: () => void;
  onGoDashboard: () => void;
  onLogout: () => void;
  session: AuthSession;
  view: 'admin' | 'dashboard';
};

export default function DashboardPage({
  notice,
  onGoAdmin,
  onGoDashboard,
  onLogout,
  session,
  view,
}: DashboardPageProps) {
  const isAdmin = session.user.role === 'ADMIN';

  return (
    <div className="min-h-[100dvh] bg-surface font-sans text-text-primary">
      <header className="border-b border-pink-400/15 px-[clamp(1rem,5vw,2.5rem)] py-[clamp(0.875rem,1.9dvh,1.5rem)]">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
          <Logo />
          <nav
            aria-label="Primary navigation"
            className="flex flex-wrap items-center justify-start gap-3 md:justify-end"
          >
            <button
              className="text-sm font-semibold text-text-secondary hover:text-text-primary"
              onClick={onGoDashboard}
              type="button"
            >
              Dashboard
            </button>
            {isAdmin && (
              <button
                className="text-sm font-semibold text-text-secondary hover:text-text-primary"
                onClick={onGoAdmin}
                type="button"
              >
                Admin
              </button>
            )}
            <button
              className="rounded-[8px] border border-pink-400/30 px-3 py-2 text-sm font-semibold text-pink-300"
              onClick={onLogout}
              type="button"
            >
              Log out
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-[clamp(1rem,5vw,2.5rem)] py-[clamp(2rem,5dvh,3.5rem)]">
        {notice && (
          <p
            className="rounded-[8px] border border-pink-400/25 bg-pink-400/10 px-4 py-3 text-sm text-text-secondary"
            role="status"
          >
            {notice}
          </p>
        )}
        {view === 'admin' ? (
          <>
            <section>
              <p className="text-sm font-semibold uppercase text-pink-300">
                Admin
              </p>
              <h1 className="mt-2 text-3xl font-extrabold">Admin console</h1>
            </section>
            <AdminCatalogPage />
          </>
        ) : (
          <section>
            <p className="text-sm font-semibold uppercase text-pink-300">
              {session.user.role}
            </p>
            <h1 className="mt-2 text-3xl font-extrabold">
              Welcome, {session.user.username}
            </h1>
            <p className="mt-3 max-w-2xl text-text-secondary">
              Your account is ready. Choose a race mode when the next gameplay
              task lands.
            </p>
          </section>
        )}
      </main>
    </div>
  );
}
