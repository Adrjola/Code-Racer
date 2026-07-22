import { useState } from 'react';
import type { CSSProperties } from 'react';
import dashboardNavIcon from '@/assets/icons/dashboard-nav.svg';
import logoutNavIcon from '@/assets/icons/logout-nav.svg';
import { useDesignScale } from '@/hooks/useDesignScale';
import Logo from './Logo';
import LogoutConfirmDialog from './LogoutConfirmDialog';

const DESIGN_WIDTH = 1920;

type HeaderProps = {
  isAdmin?: boolean;
  onGoAdmin?: () => void;
  onGoDashboard: () => void;
  onLogout: () => void;
  username: string;
};

const navLinkClassName =
  'text-sm font-semibold text-text-secondary hover:text-text-primary';

const navIconButtonClassName = 'size-10 shrink-0 transition hover:opacity-90';

export default function Header({
  isAdmin = false,
  onGoAdmin,
  onGoDashboard,
  onLogout,
  username,
}: HeaderProps) {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const scale = useDesignScale(DESIGN_WIDTH);

  return (
    <header
      className="relative lg:h-[calc(88px*var(--header-scale))] lg:overflow-hidden"
      style={{ '--header-scale': scale } as CSSProperties}
    >
      <div className="mx-auto flex w-full max-w-[100rem] items-center justify-between gap-4 px-4 py-3.5 md:px-10 md:py-6 lg:absolute lg:left-1/2 lg:top-0 lg:h-[88px] lg:w-[1920px] lg:max-w-none lg:origin-top lg:[transform:translateX(-50%)_scale(var(--header-scale))]">
        <Logo />
        <nav
          aria-label="Primary navigation"
          className="flex flex-nowrap items-center justify-end gap-2 md:gap-6"
        >
          {isAdmin && onGoAdmin && (
            <button
              className={navLinkClassName}
              onClick={onGoAdmin}
              type="button"
            >
              Admin
            </button>
          )}
          <button
            aria-label="Dashboard"
            className={navIconButtonClassName}
            onClick={onGoDashboard}
            type="button"
          >
            <img alt="" className="block size-full" src={dashboardNavIcon} />
          </button>
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
            onClick={() => setShowLogoutConfirm(true)}
            type="button"
          >
            <img alt="" className="block size-full" src={logoutNavIcon} />
          </button>
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
