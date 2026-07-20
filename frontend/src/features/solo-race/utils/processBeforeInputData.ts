export function processBeforeInputData(
  isLocked: boolean,
  data: string | null | undefined,
  handleInput: (char: string) => void,
  preventDefault: () => void,
) {
  if (isLocked) return;
  if (!data) return;

  preventDefault();
  for (const char of data) {
    handleInput(char);
  }
}
