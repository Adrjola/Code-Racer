/** Formats a duration as m:ss.mmm. */
export function formatDurationPrecise(durationMs: number | null): string {
  if (durationMs === null) {
    return '--';
  }

  const safeMs = Math.max(0, durationMs);
  const minutes = Math.floor(safeMs / 60_000);
  const seconds = Math.floor((safeMs % 60_000) / 1000);
  const millis = Math.floor(safeMs % 1000);
  return `${minutes}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
}
