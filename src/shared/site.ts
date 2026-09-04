import { searchIndex, type Entry } from '../site/data.ts'

const nav = navigator as Navigator & {userAgentData?: {platform?: string}}
const currentScript = document.currentScript
const SCRIPT_ROOT = new URL('.', currentScript instanceof HTMLScriptElement ? currentScript.src : location.href)
const norm = (value: string) => value.toLowerCase()

function score(item: Entry, query: string): number {
  if (!query) return 1
  const title = norm(item.title)
  if (title === query) return 100
  if (title.startsWith(query)) return 70
  if (title.includes(query)) return 50
  const text = norm(`${item.title} ${item.kind} ${item.note} ${(item.tags ?? []).join(' ')}`)
  const words = query.split(/\s+/).filter(Boolean)
  return words.every(word => text.includes(word)) ? 20 + words.length : 0
}

let box: HTMLDivElement | undefined
let input!: HTMLInputElement
let results!: HTMLDivElement
let opener: HTMLElement | null = null
let active = 0
let visible: Entry[] = []

const shortcutLabel = /Mac|iPhone|iPad|iPod/i.test(nav.userAgentData?.platform || nav.platform || nav.userAgent) ? '⌘ K' : 'Ctrl K'
const syncShortcutLabels = () => document.querySelectorAll<HTMLElement>('[data-search-shortcut]').forEach(element => element.textContent = shortcutLabel)
syncShortcutLabels()
addEventListener('samey-pageload', syncShortcutLabels)

function resultNode(item: Entry, index: number): HTMLAnchorElement {
  const anchor = document.createElement('a')
  anchor.className = `search-result${index === active ? ' active' : ''}`
  anchor.href = new URL(item.href, SCRIPT_ROOT).href
  const text = document.createElement('span')
  const title = document.createElement('b')
  const note = document.createElement('small')
  const meta = document.createElement('span')
  meta.className = 'search-result-meta'
  const kind = document.createElement('em')
  const destination = document.createElement('span')
  destination.className = 'search-result-destination'
  const targetUrl = new URL(item.href, SCRIPT_ROOT)
  const external = targetUrl.origin !== location.origin
  const newPage = external || targetUrl.pathname !== location.pathname
  title.textContent = item.title
  note.textContent = item.note
  kind.textContent = item.kind
  destination.textContent = external ? '↗' : newPage ? '→' : ''
  destination.setAttribute('aria-label', external ? 'External website' : newPage ? 'Opens another page' : 'Opens in this page')
  if (external) { anchor.target = '_blank'; anchor.rel = 'noopener noreferrer' }
  text.append(title, note)
  meta.append(kind, destination)
  anchor.append(text, meta)
  return anchor
}

function render() {
  const query = norm(input.value.trim())
  visible = searchIndex
    .map(item => [item, score(item, query)] as const)
    .filter(([, rank]) => rank > 0)
    .sort(([a, ar], [b, br]) => br - ar || a.title.localeCompare(b.title))
    .slice(0, 9)
    .map(([item]) => item)
  active = Math.min(active, Math.max(0, visible.length - 1))
  if (visible.length) results.replaceChildren(...visible.map(resultNode))
  else {
    const empty = document.createElement('div')
    empty.className = 'search-empty'
    empty.textContent = 'No match'
    results.replaceChildren(empty)
  }
}

function close(restoreFocus = true) {
  if (!box || box.hidden) return
  box.hidden = true
  const target = opener
  opener = null
  if (restoreFocus && target) requestAnimationFrame(() => target.isConnected && target.focus())
}

function ensure() {
  if (box) return
  box = document.createElement('div')
  box.className = 'site-search'
  box.dataset.sameyOverlay = ''
  box.dataset.sameyRuntime = ''
  box.hidden = true
  box.innerHTML = '<div class="site-search-backdrop" data-close-search></div><div class="site-search-panel" role="dialog" aria-modal="true" aria-label="Search"><div class="site-search-input"><span>›</span><input autocomplete="off" spellcheck="false" placeholder="Search games, tools, writing, work…"><kbd>esc</kbd></div><div class="site-search-results"></div></div>'
  document.body.append(box)
  input = box.querySelector<HTMLInputElement>('input')!
  results = box.querySelector<HTMLDivElement>('.site-search-results')!
  input.addEventListener('input', () => { active = 0; render() })
  box.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target : null
    if (target?.closest('a.search-result')) close(false)
    else if (target?.closest('[data-close-search]')) close()
  })
  input.addEventListener('keydown', event => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      active = (active + (event.key === 'ArrowDown' ? 1 : visible.length - 1)) % Math.max(visible.length, 1)
      render()
    } else if (event.key === 'Enter' && visible[active]) {
      event.preventDefault()
      const targetUrl = new URL(visible[active].href, SCRIPT_ROOT)
      close(false)
      if (targetUrl.origin !== location.origin) window.open(targetUrl.href, '_blank', 'noopener,noreferrer')
      else if (globalThis.SameyNavigate) void globalThis.SameyNavigate(targetUrl.href)
      else location.assign(targetUrl.href)
    }
  })
}

function open(trigger?: EventTarget | null) {
  ensure()
  opener = trigger instanceof HTMLElement ? trigger : document.activeElement instanceof HTMLElement ? document.activeElement : null
  box!.hidden = false
  active = 0
  input.value = ''
  render()
  requestAnimationFrame(() => input.focus())
}

addEventListener('samey-pageleave', () => close(false))
addEventListener('keydown', event => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    box && !box.hidden ? close() : open()
  } else if (event.key === 'Escape') close()
})
document.addEventListener('click', event => {
  const target = event.target instanceof Element ? event.target : null
  const trigger = target?.closest('[data-open-search]')
  if (trigger) open(trigger)
})
