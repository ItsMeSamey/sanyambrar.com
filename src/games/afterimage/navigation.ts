import type { GameId } from './types.ts';

const navigationKey = 'afterimage-navigation-v1';
const stateKey = 'afterimage';
const previousKey = 'afterimageHasPrevious';
export type AfterimageRoute = { version: 2; game: GameId | null; selectedCard: GameId | null; homeScroll: number };
type NavigationHistory = Pick<History, 'length' | 'state' | 'pushState' | 'replaceState' | 'back'>;
type NavigationStorage = Pick<Storage, 'getItem' | 'setItem'>;
const library = (): AfterimageRoute => ({ version: 2, game: null, selectedCard: null, homeScroll: 0 });
const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const validScroll = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 10000000;

/** Each browser entry owns its route; session storage only restores a fresh document entry. */
export function createAfterimageNavigation(history: NavigationHistory, storage: NavigationStorage, gameIds: readonly GameId[]) {
  const validGame = (value: unknown): value is GameId => typeof value === 'string' && gameIds.includes(value as GameId);
  function readRoute(value: unknown): AfterimageRoute | null {
    const route = record(value);
    if (route.version !== 2 || !validScroll(route.homeScroll) || (route.game !== null && !validGame(route.game)) || (route.selectedCard !== null && !validGame(route.selectedCard))) return null;
    return { version: 2, game: route.game, selectedCard: route.selectedCard, homeScroll: route.homeScroll };
  }
  function readSession(): AfterimageRoute {
    try {
      const saved = record(JSON.parse(storage.getItem(navigationKey) ?? 'null'));
      const route = readRoute(saved);
      if (route) return route;
      if (saved.version !== 1 || !['games', 'play'].includes(String(saved.screen)) || !validScroll(saved.homeScroll)) return library();
      let id = saved.game === 'order' ? 'number-order' : saved.game === 'math' ? 'arithmetic' : saved.game === 'tps' ? 'cps' : saved.game;
      if (['sequence', 'reverse'].includes(String(id)) ? !['growing', 'fresh'].includes(String(saved.variant)) : saved.variant !== null) return library();
      if (saved.variant === 'fresh') id = `${String(id)}-fresh`;
      const selectedCard = validGame(id) ? id : null;
      return { version: 2, game: saved.screen === 'play' ? selectedCard : null, selectedCard, homeScroll: saved.homeScroll };
    } catch { return library(); }
  }
  let current = readRoute(record(history.state)[stateKey]) ?? readSession();
  const readPrevious = (state: unknown) => typeof record(state)[previousKey] === 'boolean' ? record(state)[previousKey] as boolean : history.length > 1;
  let hasPrevious = readPrevious(history.state);
  function persist() {
    try { storage.setItem(navigationKey, JSON.stringify(current)); } catch { /* History navigation also works without storage. */ }
  }
  function replace() {
    history.replaceState({ ...record(history.state), [stateKey]: current, [previousKey]: hasPrevious }, '');
    persist();
    return current;
  }
  replace();
  return {
    current: () => current,
    canGoBack: () => hasPrevious,
    home() {
      if (!current.game) return current;
      current = { ...current, game: null };
      hasPrevious = true;
      history.pushState({ ...record(history.state), [stateKey]: current, [previousKey]: true }, '');
      persist();
      return current;
    },
    open(id: GameId, scroll: number) {
      if (!current.game) {
        current = { ...current, selectedCard: id, homeScroll: validScroll(scroll) ? scroll : 0 };
        replace();
      }
      current = { ...current, game: id, selectedCard: id };
      hasPrevious = true;
      history.pushState({ ...record(history.state), [stateKey]: current, [previousKey]: true }, '');
      persist();
      return current;
    },
    recordScroll(scroll: number) {
      if (!current.game && validScroll(scroll) && scroll !== current.homeScroll) {
        current = { ...current, homeScroll: scroll };
        replace();
      }
    },
    back(): AfterimageRoute | null {
      if (hasPrevious) {
        history.back();
        return null;
      }
      current = { ...current, game: null };
      return replace();
    },
    restore(state: unknown) {
      // A popped entry without our state is a library entry, never the last session's game.
      current = readRoute(record(state)[stateKey]) ?? library();
      hasPrevious = readPrevious(state);
      return replace();
    },
  };
}
