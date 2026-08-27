'use strict'

const storageChange = () => window.dispatchEvent(new Event('wordle:storage-change'))

export class LocalstorageStore<T> {
  readonly key: string
  readonly fromString: (value: string) => T
  readonly toString: (value: T) => string | undefined
  current_value: T | undefined

  constructor(
    key: string,
    defaultValue?: T,
    fromString: (value: string) => T = value => value as T,
    toString: (value: T) => string | undefined = value => String(value),
  ) {
    this.key = key
    this.fromString = fromString
    this.toString = toString

    let raw: string | null = null
    try { raw = localStorage.getItem(key) } catch {}
    if (raw === null) {
      this.current_value = defaultValue
      if (defaultValue !== undefined) this.write(defaultValue)
      return
    }
    try {
      this.current_value = this.fromString(raw)
    } catch {
      // Corrupt or stale persisted state must never make the app unbootable.
      this.current_value = defaultValue
      if (defaultValue !== undefined) this.write(defaultValue)
      else { try { localStorage.removeItem(this.key) } catch {} }
    }
  }

  get(): T | undefined {
    return this.current_value
  }

  private write(value: T | undefined) {
    try {
      if (value === undefined) localStorage.removeItem(this.key)
      else {
        const serialized = this.toString(value)
        if (serialized === undefined) localStorage.removeItem(this.key)
        else localStorage.setItem(this.key, serialized)
      }
    } catch {}
    storageChange()
  }

  set(value: T | undefined) {
    this.current_value = value
    this.write(value)
  }
}

export class UrlSearchStore<T> {
  readonly key: string
  readonly defaultValue: T | undefined
  readonly fromString: (value: string) => T
  readonly toString: (value: T) => string
  current_value: T | undefined

  constructor(
    key: string,
    defaultValue?: T,
    fromString: (value: string) => T = value => value as T,
    toString: (value: T) => string = value => String(value),
  ) {
    this.key = key
    this.defaultValue = defaultValue
    this.fromString = fromString
    this.toString = toString
    this.current_value = this.readLocation()
  }

  private readLocation(): T | undefined {
    const raw = new URL(location.href).searchParams.get(this.key)
    return raw === null ? this.defaultValue : this.fromString(raw)
  }

  refresh(): T | undefined {
    return (this.current_value = this.readLocation())
  }

  get(): T | undefined {
    return this.current_value
  }

  set(value: T | undefined, { replace = false } = {}) {
    this.current_value = value
    const url = new URL(location.href)
    if (value === undefined || value === this.defaultValue) url.searchParams.delete(this.key)
    else url.searchParams.set(this.key, this.toString(value))

    const state = { ...(history.state ?? {}), [this.key]: value }
    history[replace ? 'replaceState' : 'pushState'](state, '', url)
  }
}
