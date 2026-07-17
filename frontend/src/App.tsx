import { SoloRace } from './features/solo-race/components/SoloRace';
import { useSoloRaceSession } from './features/solo-race/hooks/useSoloRaceSession';
import { Link, Navigate, Route, Routes, useParams } from 'react-router-dom';
import { routes } from './routes';

const fallbackStartedAt = new Date().toISOString();
const fallbackSnippet = {
  id: 'unavailable-snippet',
  code: '',
  type: 'unknown',
} as const;

function SoloRacePage() {
  const { session, preview, isLoading, error, startNewRace, resetToMenuState } = useSoloRaceSession();

  const activeSnippet = session?.snippet ?? preview?.snippet ?? fallbackSnippet;
  const activeStartedAt = session?.startedAt ?? fallbackStartedAt;
  const activeTransport = session?.transport;
  const pageErrorMessage = error ?? (!isLoading && !session?.snippet && !preview?.snippet ? 'Unable to load solo race snippet' : null);

  return (
    <SoloRace
      snippet={activeSnippet}
      startedAt={activeStartedAt}
      transport={activeTransport}
      onStartRace={startNewRace}
      onRestartRace={startNewRace}
      onLobbyNavigate={resetToMenuState}
      errorMessage={pageErrorMessage}
    />
  );
}

function HomePage() {
  return (
    <section className="w-full max-w-2xl space-y-4 text-center">
      <h1 className="text-5xl font-bold tracking-tight">Code Racer</h1>
    </section>
  );
}

function LobbyPage() {
  return (
    <section className="w-full max-w-2xl space-y-4 text-center">
      <h1 className="text-3xl font-bold tracking-tight">Lobby</h1>
      <div className="flex justify-center gap-3">
        <Link className="rounded border border-slate-700 px-4 py-2 hover:border-slate-500" to={routes.playPublic}>
          Multiplayer
        </Link>
        <Link className="rounded border border-slate-700 px-4 py-2 hover:border-slate-500" to={routes.playSolo}>
          Singleplayer
        </Link>
      </div>
    </section>
  );
}

function PublicMatchmakingPage() {
  return <h1 className="text-3xl font-bold tracking-tight">Public matchmaking coming soon</h1>;
}

function LobbyRacePage() {
  const { lobbyCode } = useParams();
  return <h1 className="text-3xl font-bold tracking-tight">Lobby {lobbyCode}</h1>;
}

function MatchRacePage() {
  const { matchId } = useParams();
  return <h1 className="text-3xl font-bold tracking-tight">Match {matchId}</h1>;
}

export default function App() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 text-slate-50">
      <Routes>
        <Route element={<HomePage />} path={routes.home} />
        <Route element={<LobbyPage />} path={routes.lobby} />
        <Route element={<SoloRacePage />} path={routes.playSolo} />
        <Route element={<PublicMatchmakingPage />} path={routes.playPublic} />
        <Route element={<LobbyRacePage />} path={routes.playLobby} />
        <Route element={<MatchRacePage />} path={routes.playMatch} />
        <Route element={<Navigate replace to={routes.home} />} path="*" />
      </Routes>
    </main>
  );
}
