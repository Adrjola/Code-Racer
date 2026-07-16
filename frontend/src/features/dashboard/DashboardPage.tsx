import Logo from '@/components/Logo';
import type { AuthSession } from '@/features/auth/auth';

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
    <div className="min-h-dvh bg-surface font-sans text-text-primary">
      <header className="border-b border-pink-400/15 px-5 py-4 sm:px-10">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <Logo />
          <nav
            aria-label="Primary navigation"
            className="flex items-center gap-3"
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

      <main className="mx-auto flex max-w-5xl flex-col gap-5 px-5 py-10 sm:px-10">
        {notice && (
          <p
            className="rounded-[8px] border border-pink-400/25 bg-pink-400/10 px-4 py-3 text-sm text-text-secondary"
            role="status"
          >
            {notice}
          </p>
        )}
        {view === 'admin' ? (
          <section>
            <p className="text-sm font-semibold uppercase text-pink-300">
              Admin
            </p>
            <h1 className="mt-2 text-3xl font-extrabold">Admin console</h1>
            <p className="mt-3 max-w-2xl text-text-secondary">
              Manage Code Racer content and moderation tools from here.
            </p>
          </section>
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
