export function readHistoryState(): Record<string, unknown> {
  const value: unknown = history.state;
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

const NAV_INDEX_KEY = '__sameyNavIndex';

export function readNavigationIndex(): number | null {
  const value = readHistoryState()[NAV_INDEX_KEY];
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

export function navigationState(index: number): Record<string, unknown> {
  return { ...readHistoryState(), [NAV_INDEX_KEY]: index };
}
