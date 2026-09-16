export function readHistoryState(): Record<string, unknown> {
  const value: unknown = history.state;
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}
