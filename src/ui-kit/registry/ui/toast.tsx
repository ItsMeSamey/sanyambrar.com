import { createSignal, For } from 'solid-js'
import { cn } from '~/lib/utils'

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
  return <div class={cn('fixed right-3 top-3 z-[100] flex w-[min(360px,calc(100vw-24px))] flex-col gap-2', props.class)} aria-live='polite'>
    <For each={items()}>{item =>
      <div class='rounded-lg border border-border bg-background/95 p-3 text-foreground shadow-lg backdrop-blur-md'>
        {item.title && <strong class='text-sm'>{item.title}</strong>}
        {item.description && <div class='mt-0.5 text-sm text-muted-foreground'>{item.description}</div>}
      </div>
    }</For>
  </div>
}
