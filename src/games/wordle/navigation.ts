'use strict'

import { createSignal } from 'solid-js';
import { readHistoryState } from '../../shared/history.ts'
import { animateRootSwap } from '../../shared/transitions.ts'

export enum Page {
  Wordle,
  Stats,
}

const readPage = (): Page => new URL(location.href).searchParams.get('p') === String(Page.Stats) ? Page.Stats : Page.Wordle
const [page, setPage] = createSignal<Page>(readPage())
let pageRootElement: HTMLElement | undefined
let navigationGeneration = 0

export const setPageRoot = (element?: HTMLElement) => { navigationGeneration++; pageRootElement = element }
export const pageRoot = () => pageRootElement?.isConnected ? pageRootElement : null

export const selectP = (value: Page) => page() === value

function commitPage(value: Page) {
  const url = new URL(location.href)
  if (value === Page.Wordle) url.searchParams.delete('p')
  else url.searchParams.set('p', String(value))
  history.pushState({...(readHistoryState() ?? {}), p: value}, '', url)
  setPage(value)
}

export function setP(value: Page) {
  const generation = ++navigationGeneration
  if (value === page()) return
  const current = pageRoot()
  void animateRootSwap(current, () => { if (generation === navigationGeneration) commitPage(value) }, pageRoot, value === Page.Wordle ? 'back' : 'forward')
}

const onPopState = () => {
  const generation = ++navigationGeneration
  const value = readPage()
  if (value === page()) return
  const current = pageRoot()
  void animateRootSwap(current, () => { if (generation === navigationGeneration) setPage(value) }, pageRoot, value === Page.Wordle ? 'back' : 'forward')
}
let pageNavigationMounted = false

export function mountPageNavigation() {
  navigationGeneration++
  const value = readPage()
  setPage(value)
  if (!pageNavigationMounted) {
    addEventListener('popstate', onPopState)
    pageNavigationMounted = true
  }
  return disposePageNavigation
}

function disposePageNavigation() {
  navigationGeneration++
  if (!pageNavigationMounted) return
  removeEventListener('popstate', onPopState)
  pageNavigationMounted = false
}
