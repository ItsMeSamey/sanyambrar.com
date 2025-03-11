'use strict'

// This way we dont create a new object every time we assign to a functions
function nothingFn(v: any) { return v }

export class LocalstorageStore<T> {
  key: string
  from_string: ((s: string) => T)
  to_string: ((t: T) => string)
  current_value: T | undefined

  constructor(key: string, default_value?: T, from_string?: ((s: string) => T), to_string?: ((t: T) => string)) {
    this.key = key
    this.from_string = from_string ?? nothingFn as any
    this.to_string = to_string ?? nothingFn as any

    this.current_value = undefined
    if (localStorage.getItem(key)) {
      this.current_value = this.from_string(localStorage.getItem(key)!)
    }
    if (this.current_value === undefined && default_value !== undefined) {
      this.set(default_value)
    }
  }

  get(): T | undefined {
    return this.current_value
  }

  set(v: T | undefined) {
    this.current_value = v
    if (v === undefined) {
      localStorage.removeItem(this.key)
    } else {
      localStorage.setItem(this.key, this.to_string(v))
    }
  }
}

export class UrlSearchStore<T> {
  key: string
  from_string: ((s: string) => T)
  to_string: ((t: T) => string)
  current_value: T | undefined

  constructor(key: string, default_value?: T, from_string?: ((s: string) => T), to_string?: ((t: T) => string)) {
    this.key = key
    this.from_string = from_string ?? nothingFn as any
    this.to_string = to_string ?? nothingFn as any
    this.current_value = undefined

    if (window.location.search.length > 1) {
      const kv = window.location.search.substring(1).split('&').find((s) => s.startsWith(key))
      if (kv !== undefined) {
        this.current_value = this.from_string(kv.substring(key.length + 1))
      }
    }
    if (this.current_value === undefined && default_value !== undefined) {
      this.set(default_value)
    }
  }

  get(): T | undefined {
    return this.current_value
  }

  set(v: T | undefined) {
    this.current_value = v
    const filteredKeys = window.location.search.slice(1).split('&').filter((s) => s.length && !s.startsWith(this.key))
    const url = new URL(window.location.href)
    if (v === undefined) {
      this.current_value = undefined
      const newSearch = '?' + filteredKeys.join('&')
      window.history.pushState({}, '', Object.assign(url, {search: newSearch}))
    } else {
      const historyObj: any= {}
      historyObj[this.key] = this.current_value

      const newSearch = '?' + filteredKeys.concat([`${this.key}=${this.to_string(v)}`]).join('&')
      window.history.pushState(historyObj, '', Object.assign(url, {search: newSearch}))
    }
  }
}

export class UrlHashStore<T> {
  key: string
  from_string: ((s: string) => T)
  to_string: ((t: T) => string)
  current_value: T | undefined

  constructor(key: string, default_value?: T, from_string?: ((s: string) => T), to_string?: ((t: T) => string)) {
    this.key = key
    this.from_string = from_string ?? nothingFn as any
    this.to_string = to_string ?? nothingFn as any
    this.current_value = undefined

    if (window.location.search.length > 1) {
      const kv = window.location.hash.substring(1).split('&').find((s) => s.startsWith(key))
      if (kv !== undefined) {
        this.current_value = this.from_string(kv.substring(key.length + 1))
      }
    }
    if (this.current_value === undefined && default_value !== undefined) {
      this.set(default_value)
    }
  }

  get(): T | undefined {
    return this.current_value
  }

  set(v: T | undefined) {
    this.current_value = v
    const filteredKeys = window.location.hash.slice(1).split('&').filter((s) => s.length && !s.startsWith(this.key))
    if (v === undefined) {
      this.current_value = undefined
      window.location.hash = '#' + filteredKeys.join('&')
    } else {
      const historyObj: any= {}
      historyObj[this.key] = this.current_value
      window.location.hash = '#' + filteredKeys.concat([this.key+'='+this.to_string(v)]).join('&')
    }
  }
}

