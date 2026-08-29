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
let pageRootElement: HTMLElement | undefined

export const setPageRoot = (element?: HTMLElement) => { pageRootElement = element }
export const pageRoot = () => pageRootElement?.isConnected ? pageRootElement : null

export const p = page
export const selectP = createSelector(page)

function commitPage(value: Page) {
  pageState.set(value)
  setPage(value)
}

export function setP(value: Page) {
  if (value === page()) return
  const current = pageRoot()
  void animateRootSwap(current, () => commitPage(value), pageRoot, value === Page.Wordle ? 'back' : 'forward')
}

const onPopState = () => {
  const value = pageState.refresh() ?? Page.Wordle
  if (value === page()) return
  const current = pageRoot()
  void animateRootSwap(current, () => { setPage(value) }, pageRoot, value === Page.Wordle ? 'back' : 'forward')
}
let pageNavigationMounted = false

export function mountPageNavigation() {
  const value = pageState.refresh() ?? Page.Wordle
  setPage(value)
  if (!pageNavigationMounted) {
    addEventListener('popstate', onPopState)
    pageNavigationMounted = true
  }
  return disposePageNavigation
}

export function disposePageNavigation() {
  if (!pageNavigationMounted) return
  removeEventListener('popstate', onPopState)
  pageNavigationMounted = false
}

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
