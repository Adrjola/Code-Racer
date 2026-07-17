import LobbyModeButton from '@/features/lobby/components/LobbyModeButton';

type LobbyPageProps = {
  onOpenSolo: () => void;
};

export default function LobbyPage({ onOpenSolo }: LobbyPageProps) {
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-[#121022] px-6 text-white">
      <h1 className="text-3xl font-bold">Lobby</h1>
      <div className="flex items-center gap-3">
        <LobbyModeButton variant="secondary">Multiplayer</LobbyModeButton>
        <LobbyModeButton onClick={onOpenSolo} variant="primary">
          Singleplayer
        </LobbyModeButton>
      </div>
    </main>
  );
}
