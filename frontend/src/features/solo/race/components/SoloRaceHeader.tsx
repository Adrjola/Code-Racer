import type { CSSProperties, ReactNode } from 'react';
import { flowHeaderClassName, flowInnerClassName } from '@/components/Header';
import Logo from '@/components/Logo';
import { useDesignScale } from '@/hooks/useDesignScale';
import { SoloRaceHeaderActions } from './SoloRaceHeaderActions';

const DESIGN_WIDTH = 1920;

interface SoloRaceHeaderProps {
  actionLabel: string;
  children?: ReactNode;
  onAction: () => void;
  onLobby: () => void;
}

/**
 * The race has its own actions instead of the site nav, but it borrows the
 * shared header's scaled 1920 canvas so the logo lands in exactly the same
 * spot as on every other page.
 */
export function SoloRaceHeader({
  actionLabel,
  children,
  onAction,
  onLobby,
}: SoloRaceHeaderProps) {
  const headerScale = useDesignScale(DESIGN_WIDTH);

  return (
    <header
      className={flowHeaderClassName}
      style={{ '--header-scale': headerScale } as CSSProperties}
    >
      <div className={`${flowInnerClassName} justify-between`}>
        <Logo />
        <SoloRaceHeaderActions
          actionLabel={actionLabel}
          onAction={onAction}
          onLobby={onLobby}
        />
        {children}
      </div>
    </header>
  );
}
