import { createEffect, createSignal, For, onCleanup } from 'solid-js';
import { hideLayer, showLayer } from '../overlay.ts';

type ToastOptions = { title?: string; description?: string; variant?: string; duration?: number }
type ToastItem = ToastOptions & { id: number }
const [items, setItems] = createSignal<ToastItem[]>([])
let nextId = 0

export function showToast(options: ToastOptions) {
  const item = { ...options, id: ++nextId }
  setItems(items => [...items, item])
  setTimeout(() => setItems(items => items.filter(candidate => candidate.id !== item.id)), options.duration ?? 3000)
}

export function showError(error: Error) {
  console.error(error)
  showToast({title: error.name, description: error.message, variant: 'error', duration: 4000})
}

export function Toaster(props: { class?: string }) {
  let surface!: HTMLDivElement
  createEffect(items, current => {
    if (current.length) showLayer(surface)
    else hideLayer(surface)
  })
  onCleanup(() => hideLayer(surface))
  return <>
    <div class='sr-only' data-live-announcer='' aria-live='polite' aria-relevant='additions text'>
      <For each={items()}>{item => <div aria-atomic='true'>{item.title} {item.description}</div>}</For>
    </div>
    <div ref={surface} popover='manual' data-samey-layer-decoration='' aria-hidden='true' class={['samey-toaster', props.class].filter(Boolean).join(' ')}>
      <For each={items()}>{item =>
        <div class='samey-toast' data-variant={item.variant}>
          {item.title && <strong class='samey-toast-title'>{item.title}</strong>}
          {item.description && <div class='samey-toast-description'>{item.description}</div>}
        </div>
      }</For>
    </div>
  </>
}
