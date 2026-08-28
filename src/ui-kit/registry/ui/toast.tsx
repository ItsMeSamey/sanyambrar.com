import { createSignal, For } from 'solid-js'
import { cx } from '~/lib/classes'

type ToastOptions = { title?: string; description?: string; variant?: string; duration?: number }
type ToastItem = ToastOptions & { id: number }
const [items, setItems] = createSignal<ToastItem[]>([])
let nextId = 0

export function showToast(options: ToastOptions) {
  const item = { ...options, id: ++nextId }
  setItems(items => [...items, item])
  setTimeout(() => setItems(items => items.filter(candidate => candidate.id !== item.id)), options.duration ?? 3000)
}

export function Toaster(props: { class?: string }) {
  return <div class={cx('samey-toaster', props.class)} aria-live='polite'>
    <For each={items()}>{item =>
      <div class='samey-toast' data-variant={item.variant}>
        {item.title && <strong class='samey-toast-title'>{item.title}</strong>}
        {item.description && <div class='samey-toast-description'>{item.description}</div>}
      </div>
    }</For>
  </div>
}
