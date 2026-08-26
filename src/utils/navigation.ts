'use strict'

import { createSelector, createSignal, untrack } from 'solid-js'
import { UrlSearchStore } from './store'

export enum Page {
  Wordle,
  Stats,
  Share,
  Error,
}

const pageState = new UrlSearchStore('p', Page.Wordle, value => Number(value) as Page, String)
const [page, setPage] = createSignal<Page>(pageState.get() ?? Page.Wordle)

export const p = page
export const selectP = createSelector(page)

export function setP(value: Page) {
  pageState.set(value)
  setPage(value)
}

addEventListener('popstate', () => setPage(pageState.refresh() ?? Page.Wordle))

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
