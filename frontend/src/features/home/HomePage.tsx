import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import Button from '@/components/Button';
import Header from '@/components/Header';
import { PeopleIcon, PersonIcon } from '@/components/icons';
import SnippetsPage from '@/features/admin/pages/SnippetsPage';
import UsersPage from '@/features/admin/users/UsersPage';
import type { AuthSession } from '@/features/auth/session';

type HomePageProps = {
  notice?: string;
  onGoAdmin: () => void;
  onGoHome: () => void;
  onGoStatistics: () => void;
  onLogout: () => void;
  onPlaySolo: () => void;
  session: AuthSession;
  view: 'admin' | 'home';
};

// gradient-border (see index.css) paints the variant's --card-border-gradient
// as a 1px ring that follows the rounded corners, leaving the fill untouched.
const modeCardBaseClassName =
  'gradient-border flex w-full items-center gap-6 rounded-3xl bg-[rgb(15_13_23_/_0.55)] px-6 py-8 text-left lg:min-h-[17rem] lg:gap-12 lg:px-16 lg:py-14';

const modeCardInteractiveClassName =
  'transition duration-150 ease-out hover:-translate-y-0.5 focus-visible:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2';

const modeCardIconBaseClassName =
  'flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br lg:h-20 lg:w-20 lg:rounded-xl';

const modeCardTitleClassName =
  'block font-mono text-xl font-bold text-text-primary lg:text-4xl';

const modeCardDescriptionClassName =
  'mt-2 block font-mono text-xs text-text-secondary lg:mt-3 lg:text-sm';

const modeCardActionBaseClassName =
  'inline-flex shrink-0 items-center gap-1.5 font-mono text-sm font-bold tracking-wide lg:gap-2 lg:text-lg';

const modeCardIconGlyphClassName = 'size-6 lg:size-8';

const modeVariantClasses = {
  multiplayer: {
    action: 'text-blue-300',
    borderGradient:
      'linear-gradient(140deg, rgb(96 165 250 / 0.9) 0%, rgb(168 85 247 / 0.45) 45%, rgb(96 165 250 / 0.1) 100%)',
    icon: 'from-blue-500 to-purple-500 shadow-[0_0_32px_-2px_rgb(59_130_246_/_0.7)]',
    ring: 'focus-visible:ring-blue-400/50',
  },
  solo: {
    action: 'text-pink-300',
    borderGradient:
      'linear-gradient(140deg, rgb(244 114 182 / 0.9) 0%, rgb(168 85 247 / 0.45) 45%, rgb(244 114 182 / 0.1) 100%)',
    icon: 'from-pink-400 to-purple-500 shadow-[0_0_32px_-2px_rgb(219_39_119_/_0.75)]',
    ring: 'focus-visible:ring-pink-400/50',
  },
} as const;

type ModeCardProps = {
  action: string;
  comingSoon?: boolean;
  description: string;
  icon: ReactNode;
  onClick: () => void;
  title: string;
  variant?: 'multiplayer' | 'solo';
};

function ModeCard({
  action,
  comingSoon = false,
  description,
  icon,
  onClick,
  title,
  variant = 'solo',
}: ModeCardProps) {
  const variantClasses = modeVariantClasses[variant];

  return (
    <button
      className={`${modeCardBaseClassName} ${variantClasses.ring} ${
        comingSoon ? 'cursor-not-allowed' : modeCardInteractiveClassName
      }`}
      disabled={comingSoon}
      onClick={onClick}
      style={
        {
          '--card-border-gradient': variantClasses.borderGradient,
          '--gradient-border-width': '1.5px',
        } as CSSProperties
      }
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
        {!comingSoon && <span aria-hidden="true">{'>'}</span>}
        {action}
      </span>
    </button>
  );
}

// Mirrors StatisticsPage: measures the unscaled content height (transforms don't
// affect contentRect) so the scaled canvas's wrapper can reserve the right space.
function useNaturalHeight() {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) {
      return;
    }
    const observer = new ResizeObserver(([entry]) => {
      setHeight(entry.contentRect.height);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return { height, ref };
}

export default function HomePage({
  notice,
  onGoAdmin,
  onGoHome,
  onGoStatistics,
  onLogout,
  onPlaySolo,
  session,
  view,
}: HomePageProps) {
  const isAdmin = session.user.role === 'ADMIN';
  const { height, ref: canvasRef } = useNaturalHeight();
  const [adminTab, setAdminTab] = useState<'snippets' | 'users'>('snippets');

  const noticeBanner = notice ? (
    <p
      className="rounded-[8px] border border-pink-400/25 bg-pink-400/10 px-4 py-3 text-sm text-text-secondary"
      role="status"
    >
      {notice}
    </p>
  ) : null;

  // Fixed lg paddings (not the fluid clamps) so the desktop layout is
  // resolution-independent inside the scaled 1920px canvas.
  const header = (
    <Header
      isAdmin={isAdmin}
      onGoAdmin={onGoAdmin}
      onGoDashboard={onGoHome}
      onGoStatistics={onGoStatistics}
      onLogout={onLogout}
      username={session.user.username}
    />
  );

  if (view === 'admin') {
    return (
      <div className="min-h-[100dvh] bg-surface font-sans text-text-primary">
        {header}
        <main className="mx-auto flex w-full max-w-[100rem] flex-col gap-5 px-[clamp(1rem,5vw,2.5rem)] py-[clamp(2rem,5dvh,3.5rem)]">
          {noticeBanner}
          <section>
            <p className="text-sm font-semibold uppercase text-pink-300">
              Admin
            </p>
            <h1 className="mt-2 text-3xl font-extrabold">Admin console</h1>
            <nav aria-label="Admin sections" className="mt-4 flex gap-2">
              <Button
                onClick={() => setAdminTab('snippets')}
                variant={adminTab === 'snippets' ? 'primary' : 'ghost'}
              >
                Snippets
              </Button>
              <Button
                onClick={() => setAdminTab('users')}
                variant={adminTab === 'users' ? 'primary' : 'ghost'}
              >
                Users
              </Button>
            </nav>
          </section>
          {adminTab === 'snippets' ? (
            <SnippetsPage />
          ) : (
            <UsersPage session={session} />
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-surface font-sans text-text-primary">
      {header}
      {/* From lg up the content is laid out on a fixed 1920px canvas and scaled
          by --canvas-scale (innerWidth / 1920, set in main.tsx), so the page
          looks identical at any width or zoom. Below lg it flows fluidly. */}
      <div
        className="lg:overflow-hidden lg:[height:calc(var(--home-canvas-h)*var(--canvas-scale))]"
        style={{ '--home-canvas-h': `${height}px` } as CSSProperties}
      >
        <div
          className="lg:w-[1920px] lg:origin-top-left lg:[transform:scale(var(--canvas-scale))]"
          ref={canvasRef}
        >
          <main className="w-full py-[clamp(2rem,5dvh,3.5rem)] lg:py-14">
            <div className="mx-auto flex w-full max-w-[100rem] flex-col gap-5 px-[clamp(1rem,5vw,2.5rem)] lg:px-10">
              {noticeBanner}
              <section>
                <h1 className="sr-only">Choose a race mode</h1>
                <div className="flex flex-col gap-6 lg:gap-8">
                  <ModeCard
                    action="RUN"
                    description="Just you, the clock and Benji narrating every typo."
                    icon={<PersonIcon className={modeCardIconGlyphClassName} />}
                    onClick={onPlaySolo}
                    title="./solo_race"
                    variant="solo"
                  />
                  <ModeCard
                    action="COMING SOON..."
                    comingSoon
                    description="Race real humans in real time. Public, permanent shame."
                    icon={<PeopleIcon className={modeCardIconGlyphClassName} />}
                    onClick={() => {}}
                    title="./multiplayer"
                    variant="multiplayer"
                  />
                </div>
              </section>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
