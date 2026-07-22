import type { ReactNode } from 'react';
import { SoloRaceBrand } from './SoloRaceBrand';
import { SoloRaceHeaderActions } from './SoloRaceHeaderActions';

interface SoloRaceHeaderProps {
  actionLabel: string;
  children?: ReactNode;
  onAction: () => void;
  onLobby: () => void;
}

export function SoloRaceHeader({
  actionLabel,
  children,
  onAction,
  onLobby,
}: SoloRaceHeaderProps) {
  return (
    <header className="flex items-center justify-between px-[38px] pt-6">
      <SoloRaceBrand />
      <SoloRaceHeaderActions
        actionLabel={actionLabel}
        onAction={onAction}
        onLobby={onLobby}
      />
      {children}
    </header>
  );
}
