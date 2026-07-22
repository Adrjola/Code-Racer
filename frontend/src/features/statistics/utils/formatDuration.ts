/** Formats a duration as m:ss.mmm, matching the stats screens' millisecond-precision display. */
export function formatDuration(durationMs: number | null): string {
  if (durationMs === null) {
    return '--';
  }

  const totalMs = Math.max(0, Math.round(durationMs));
  const minutes = Math.floor(totalMs / 60_000);
  const seconds = Math.floor((totalMs % 60_000) / 1000);
  const millis = totalMs % 1000;

  return `${minutes}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
}
