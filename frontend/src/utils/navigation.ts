'use strict'

import { createSelector, createSignal, untrack } from 'solid-js'
import { UrlSearchStore } from './store'

export enum Page {
  Wordle,
  Stats,

  Error,
}

const pageState = new UrlSearchStore('p', Page.Wordle, (s) => (Number(s) as Page), String)

const [page, setPage] = createSignal<Page>(pageState.get()!)
export const selectP = createSelector(page)

export const p = page
export function setP(val: Page) {
  pageState.set(val)
  setPage(val)
}

window.addEventListener('popstate', (e) => {
  if (e.state && e.state.p !== undefined) {
    e.preventDefault()
    setPage(e.state.p)
  } else {
    const kv = window.location.search.substring(1).split('&').find((s) => s.startsWith(pageState.key))
    console.log(kv)
    if (kv !== undefined) {
      e.preventDefault()
      setPage(Number(kv.substring(pageState.key.length + 1)) as Page)
    }
  }
})

class PageError {
  err: any = new Error('Unknown Page')
  page: Page = Page.Wordle

  constructor() {}

  _reset() {
    setPage(this.page)
  }

  get reset() {
    return this._reset.bind(this)
  }
}

export const NoPageError = new PageError()
export const pageError: PageError = new PageError()
export function setPageError(err: any) {
  console.error(err)
  pageError.err = err
  pageError.page = untrack(page)
  setPage(Page.Error)
}

