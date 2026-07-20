export const routes = {
  home: '/',
  lobby: '/lobby',
  playSolo: '/play/solo',
  playPublic: '/play/public',
  playLobby: '/play/lobby/:lobbyCode',
  playMatch: '/play/match/:matchId',
} as const;

export function buildLobbyRoute(lobbyCode: string): string {
  return `/play/lobby/${encodeURIComponent(lobbyCode)}`;
}

export function buildMatchRoute(matchId: string): string {
  return `/play/match/${encodeURIComponent(matchId)}`;
}