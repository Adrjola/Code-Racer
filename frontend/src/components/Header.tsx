import { useState } from 'react';
import type { CSSProperties } from 'react';
import statisticsNavIcon from '@/assets/icons/dashboard-nav.svg';
import logoutNavIcon from '@/assets/icons/logout-nav.svg';
import { useDesignScale } from '@/hooks/useDesignScale';
import Logo from './Logo';
import LogoutConfirmDialog from './LogoutConfirmDialog';

const DESIGN_WIDTH = 1920;

type SharedHeaderProps = {
  /**
   * "overlay" dissolves the header into a page that is already a scaled 1920
   * canvas; "flow" scales itself for pages that are not.
   */
  layout?: 'flow' | 'overlay';
};

type HeaderProps = SharedHeaderProps &
  (
    | {
        isAdmin?: boolean;
        onGoAdmin?: () => void;
        onGoDashboard: () => void;
        /** Rendered only where statistics are reachable, matching the design. */
        onGoStatistics?: () => void;
        onLogout: () => void;
        username: string;
        variant?: 'full';
      }
    | {
        variant: 'minimal';
      }
  );

const navLinkClassName =
  'text-sm font-semibold text-text-secondary hover:text-text-primary';

const navIconButtonClassName =
  'size-10 shrink-0 transition-all duration-200 hover:scale-110';

export const flowHeaderClassName =
  'relative lg:h-[calc(88px*var(--header-scale))] lg:overflow-hidden';

export const flowInnerClassName =
  'mx-auto flex w-full max-w-[100rem] items-center gap-4 px-4 py-3.5 md:px-10 md:py-6 lg:absolute lg:left-1/2 lg:top-0 lg:h-[88px] lg:w-[1920px] lg:max-w-none lg:origin-top lg:[transform:translateX(-50%)_scale(var(--header-scale))]';

const overlayWrapperClassName =
  'relative px-4 py-3.5 md:px-10 md:py-6 lg:contents';

const overlayInnerClassName =
  'mx-auto flex w-full max-w-[100rem] items-center gap-4 lg:contents';

const overlayLogoWrapClassName = 'lg:absolute lg:left-[40px] lg:top-[24px]';

const overlayNavClassName =
  'flex flex-nowrap items-center justify-end gap-2 md:gap-6 lg:absolute lg:right-[40px] lg:top-[24px]';

function NavContent({
  isAdmin,
  onGoAdmin,
  onGoStatistics,
  username,
  onOpenLogoutConfirm,
}: {
  isAdmin: boolean;
  onGoAdmin?: () => void;
  onGoStatistics?: () => void;
  username: string;
  onOpenLogoutConfirm: () => void;
}) {
  return (
    <>
      {onGoStatistics && (
        <button
          aria-label="Statistics"
          className={navIconButtonClassName}
          onClick={onGoStatistics}
          type="button"
        >
          <img alt="" className="block size-full" src={statisticsNavIcon} />
        </button>
      )}
      {isAdmin && onGoAdmin && (
        <button className={navLinkClassName} onClick={onGoAdmin} type="button">
          Admin
        </button>
      )}
      <div className="flex h-10 min-w-0 items-center gap-[9px] rounded-[9px] border border-pink-400/20 bg-pink-400/5 px-[13px] py-[6px]">
        <span className="sr-only font-mono text-[10.5px] tracking-[0.63px] text-text-muted md:not-sr-only">
          USER:
        </span>
        <span className="truncate font-mono text-[10.5px] font-bold tracking-[0.63px] text-pink-300 max-md:max-w-[6rem]">
          {username}
        </span>
      </div>
      <button
        aria-label="Log out"
        className={navIconButtonClassName}
        onClick={onOpenLogoutConfirm}
        type="button"
      >
        <img alt="" className="block size-full" src={logoutNavIcon} />
      </button>
    </>
  );
}

export default function Header(props: HeaderProps) {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  // One source for every page, so the logo is the same size everywhere.
  const headerScale = useDesignScale(DESIGN_WIDTH);
  const headerStyle = { '--header-scale': headerScale } as CSSProperties;

  const isOverlay = props.layout === 'overlay';

  if (props.variant === 'minimal') {
    if (isOverlay) {
      return (
        <header className={overlayWrapperClassName}>
          <div className={overlayInnerClassName}>
            <div className={overlayLogoWrapClassName}>
              <Logo />
            </div>
          </div>
        </header>
      );
    }
    return (
      <header className={flowHeaderClassName} style={headerStyle}>
        <div className={flowInnerClassName}>
          <Logo />
        </div>
      </header>
    );
  }

  const {
    isAdmin = false,
    onGoAdmin,
    onGoDashboard,
    onGoStatistics,
    onLogout,
    username,
  } = props;

  if (isOverlay) {
    return (
      <header className={overlayWrapperClassName}>
        <div className={`${overlayInnerClassName} justify-between`}>
          <div className={overlayLogoWrapClassName}>
            <Logo onClick={onGoDashboard} />
          </div>
          <nav aria-label="Primary navigation" className={overlayNavClassName}>
            <NavContent
              isAdmin={isAdmin}
              onGoAdmin={onGoAdmin}
              onGoStatistics={onGoStatistics}
              onOpenLogoutConfirm={() => setShowLogoutConfirm(true)}
              username={username}
            />
          </nav>
        </div>
        {showLogoutConfirm && (
          <LogoutConfirmDialog
            onCancel={() => setShowLogoutConfirm(false)}
            onConfirm={onLogout}
          />
        )}
      </header>
    );
  }

  return (
    <header className={flowHeaderClassName} style={headerStyle}>
      <div className={`${flowInnerClassName} justify-between`}>
        <Logo onClick={onGoDashboard} />
        <nav
          aria-label="Primary navigation"
          className="flex flex-nowrap items-center justify-end gap-2 md:gap-6"
        >
          <NavContent
            isAdmin={isAdmin}
            onGoAdmin={onGoAdmin}
            onGoStatistics={onGoStatistics}
            onOpenLogoutConfirm={() => setShowLogoutConfirm(true)}
            username={username}
          />
        </nav>
      </div>
      {showLogoutConfirm && (
        <LogoutConfirmDialog
          onCancel={() => setShowLogoutConfirm(false)}
          onConfirm={onLogout}
        />
      )}
    </header>
  );
}
