export function codePointLength(value: string): number {
  return Array.from(value).length;
}

export function codePointAt(value: string, index: number): string | undefined {
  return Array.from(value)[index];
}

export function sliceCodePoints(
  value: string,
  start: number,
  end?: number,
): string {
  return Array.from(value).slice(start, end).join('');
}
