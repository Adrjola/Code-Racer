/** Formats the server's attempt duration as m:ss. */
export function formatDuration(durationMs: number | null): string {
  if (durationMs === null) {
    return '--';
  }

  const totalSeconds = Math.max(0, Math.round(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
