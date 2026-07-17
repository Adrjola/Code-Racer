import type { ReactNode } from 'react';
import { SoloRaceBrand } from './SoloRaceBrand';
import { SoloRaceHeaderActions } from './SoloRaceHeaderActions';

interface SoloRaceHeaderProps {
  onRestart: () => void;
  onLobby: () => void;
  children?: ReactNode;
}

export function SoloRaceHeader({ onRestart, onLobby, children }: SoloRaceHeaderProps) {
  return (
    <header className="flex items-center justify-between px-10 pt-6 lg:px-[38px]">
      <SoloRaceBrand />
      <SoloRaceHeaderActions onLobby={onLobby} onRestart={onRestart} />
      {children}
    </header>
  );
}
