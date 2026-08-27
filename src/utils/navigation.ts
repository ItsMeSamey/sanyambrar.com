'use strict'

import { createSelector, createSignal, untrack } from 'solid-js'
import { UrlSearchStore } from './store'
import { animateRootSwap } from '../shared/transitions.ts'

export enum Page {
  Wordle,
  Stats,
  Error,
}

const parsePage = (value: string): Page => value === String(Page.Stats) ? Page.Stats : Page.Wordle
const pageState = new UrlSearchStore('p', Page.Wordle, parsePage, String)
const [page, setPage] = createSignal<Page>(pageState.get() ?? Page.Wordle)

export const p = page
export const selectP = createSelector(page)

function commitPage(value: Page) {
  pageState.set(value)
  setPage(value)
}

export function setP(value: Page) {
  if (value === page()) return
  const current = document.getElementById('wordle-view-root')
  void animateRootSwap(current, () => commitPage(value), () => document.getElementById('wordle-view-root'), value === Page.Wordle ? 'back' : 'forward')
}

addEventListener('popstate', () => {
  const value = pageState.refresh() ?? Page.Wordle
  if (value === page()) return
  const current = document.getElementById('wordle-view-root')
  void animateRootSwap(current, () => { setPage(value) }, () => document.getElementById('wordle-view-root'), value === Page.Wordle ? 'back' : 'forward')
})

class PageError {
  err: unknown = new Error('Unknown Page')
  page = Page.Wordle

  reset = () => setPage(this.page)
}

export const NoPageError = new PageError()
export const pageError = new PageError()

export function setPageError(err: unknown) {
  console.error(err)
  pageError.err = err
  pageError.page = untrack(page)
  setPage(Page.Error)
}
