import { useState, type ReactNode } from 'react';
import ConfirmDialog from '@/components/ConfirmDialog';
import Logo from '@/components/Logo';
import { ChevronRightIcon, PeopleIcon, PersonIcon } from '@/components/icons';
import SnippetsPage from '@/features/admin/pages/SnippetsPage';
import type { AuthSession } from '@/features/auth/session';

type DashboardPageProps = {
  notice?: string;
  onGoAdmin: () => void;
  onGoDashboard: () => void;
  onLogout: () => void;
  onPlaySolo: () => void;
  session: AuthSession;
  view: 'admin' | 'dashboard';
};

const modeCardBaseClassName =
  'flex w-full items-center gap-6 rounded-2xl border bg-[rgb(15_13_23_/_0.55)] px-6 py-8 text-left transition duration-150 ease-out hover:-translate-y-0.5 focus-visible:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 lg:min-h-[17rem] lg:gap-12 lg:rounded-3xl lg:px-16 lg:py-14';

const modeCardIconBaseClassName =
  'flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br lg:h-24 lg:w-24 lg:rounded-2xl';

const modeCardTitleClassName =
  'block font-mono text-xl font-bold text-text-primary lg:text-4xl';

const modeCardDescriptionClassName =
  'mt-2 block text-base text-text-secondary lg:mt-4 lg:text-xl';

const modeCardActionBaseClassName =
  'inline-flex shrink-0 items-center gap-1.5 font-mono text-sm font-bold tracking-wide lg:gap-2.5 lg:text-2xl';

const modeCardIconGlyphClassName = 'size-8 lg:size-12';

const modeCardChevronClassName = 'h-3.5 w-2 lg:h-6 lg:w-3';

const modeVariantClasses = {
  multiplayer: {
    action: 'text-blue-300',
    card: 'border-blue-400/35 hover:border-blue-400/60 focus-visible:border-blue-400/60 focus-visible:ring-blue-400/50',
    icon: 'from-blue-500 to-purple-500 shadow-[0_0_32px_-2px_rgb(59_130_246_/_0.7)]',
  },
  solo: {
    action: 'text-pink-300',
    card: 'border-pink-400/30 hover:border-pink-400/55 focus-visible:border-pink-400/55 focus-visible:ring-pink-400/50',
    icon: 'from-pink-400 to-purple-500 shadow-[0_0_32px_-2px_rgb(219_39_119_/_0.75)]',
  },
} as const;

type ModeCardProps = {
  action: string;
  description: string;
  icon: ReactNode;
  onClick: () => void;
  title: string;
  variant?: 'multiplayer' | 'solo';
};

function ModeCard({
  action,
  description,
  icon,
  onClick,
  title,
  variant = 'solo',
}: ModeCardProps) {
  const variantClasses = modeVariantClasses[variant];

  return (
    <button
      className={`${modeCardBaseClassName} ${variantClasses.card}`}
      onClick={onClick}
      type="button"
    >
      <span className={`${modeCardIconBaseClassName} ${variantClasses.icon}`}>
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className={modeCardTitleClassName}>{title}</span>
        <span className={modeCardDescriptionClassName}>{description}</span>
      </span>
      <span
        className={`${modeCardActionBaseClassName} ${variantClasses.action}`}
      >
        <ChevronRightIcon className={modeCardChevronClassName} />
        {action}
      </span>
    </button>
  );
}

export default function DashboardPage({
  notice,
  onGoAdmin,
  onGoDashboard,
  onLogout,
  onPlaySolo,
  session,
  view,
}: DashboardPageProps) {
  const isAdmin = session.user.role === 'ADMIN';
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

  return (
    <div className="min-h-[100dvh] bg-surface font-sans text-text-primary">
      <header className="border-b border-pink-400/15 px-[clamp(1rem,5vw,2.5rem)] py-[clamp(0.875rem,1.9dvh,1.5rem)]">
        <div className="mx-auto flex w-full max-w-[100rem] flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
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
              Homepage
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
              onClick={() => setIsLogoutConfirmOpen(true)}
              type="button"
            >
              Log out
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[100rem] flex-col gap-5 px-[clamp(1rem,5vw,2.5rem)] py-[clamp(2rem,5dvh,3.5rem)]">
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
            <SnippetsPage />
          </>
        ) : (
          <section>
            <p className="text-sm font-semibold uppercase text-pink-300">
              {session.user.role}
            </p>
            <h1 className="mt-2 text-3xl font-extrabold lg:text-4xl">
              Welcome, {session.user.username}
            </h1>
            <div className="mt-8 flex flex-col gap-6 lg:mt-12 lg:gap-8">
              <ModeCard
                action="RUN"
                description="Just you, the clock, and the leaderboard."
                icon={<PersonIcon className={modeCardIconGlyphClassName} />}
                onClick={onPlaySolo}
                title="./solo_race"
                variant="solo"
              />
              <ModeCard
                action="RUN"
                description="Race real humans in real time."
                icon={<PeopleIcon className={modeCardIconGlyphClassName} />}
                onClick={() => {}}
                title="./multiplayer"
                variant="multiplayer"
              />
            </div>
          </section>
        )}
      </main>

      {isLogoutConfirmOpen && (
        <ConfirmDialog
          confirmLabel="Log out"
          confirmVariant="secondary"
          description="You will need to sign in again to keep racing."
          onCancel={() => setIsLogoutConfirmOpen(false)}
          onConfirm={onLogout}
          title="Log out?"
        />
      )}
    </div>
  );
}
