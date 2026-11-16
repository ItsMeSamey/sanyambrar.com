import { gameStorageKey, type ChallengeConfig } from './challenge'

const SELECTION_KEY = 'game.wordle.settings.active-source'
type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem' | 'removeItem'>

// Retain an exact-key selection if two older saves map to the same challenge.
export function selectedGameStorageKey(config: ChallengeConfig, sourceKey?: string, storage: Storage = localStorage): string {
  const target = gameStorageKey(config)
  let selected = sourceKey
  try {
    if (!selected) {
      const saved: unknown = JSON.parse(storage.getItem(SELECTION_KEY) ?? 'null')
      if (saved && typeof saved === 'object' && 'target' in saved && saved.target === target && 'source' in saved && typeof saved.source === 'string') selected = saved.source
    }
    if (!selected || !selected.startsWith('game.wordle.') || selected.startsWith('game.wordle.settings.')) return target
    const raw = storage.getItem(selected)
    if (raw === null) return target
    if (selected !== target && storage.getItem(target) === null) {
      storage.setItem(target, raw)
      if (storage.getItem(target) === raw) {
        storage.removeItem(selected)
        selected = target
      }
    }
    storage.setItem(SELECTION_KEY, JSON.stringify({target, source: selected}))
    return selected
  } catch (error) {
    console.warn('Could not migrate selected Wordle game', error)
    return selected ?? target
  }
}
