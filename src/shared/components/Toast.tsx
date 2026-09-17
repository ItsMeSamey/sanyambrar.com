import { createSignal, For } from 'solid-js';

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
  return <div class={['samey-toaster', props.class].filter(Boolean).join(' ')} aria-live='polite'>
    <For each={items()}>{item =>
      <div class='samey-toast' data-variant={item.variant}>
        {item.title && <strong class='samey-toast-title'>{item.title}</strong>}
        {item.description && <div class='samey-toast-description'>{item.description}</div>}
      </div>
    }</For>
  </div>
}
