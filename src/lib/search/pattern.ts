export function escapeIlike(value: string): string {
  return value.replaceAll(/[\\%_]/g, String.raw`\$&`);
}

export function buildContainsSearchPattern(value: string): string {
  return `%${escapeIlike(value)}%`;
}
