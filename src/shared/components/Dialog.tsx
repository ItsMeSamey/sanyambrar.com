import * as D from '@kobalte/core/dialog'
import { createEffect, omit, type ParentProps } from 'solid-js';
import { type ComponentProps } from '@solidjs/web';
import { hideLayer, isTopLayer, showLayer, topLayer } from '../overlay.ts';

type EscapeEntry = {
  close: () => void
  surface: () => HTMLElement | undefined
  focusEpoch: number
  onEscapeKeyDown?: (event: KeyboardEvent) => void
}

const escapeStack: EscapeEntry[] = []
const handleEscape = (event: KeyboardEvent) => {
  if (event.key !== 'Escape' || event.defaultPrevented) return
  const entry = [...escapeStack].reverse().find(item => isTopLayer(item.surface()))
  if (!entry) return
  entry.onEscapeKeyDown?.(event)
  if (event.defaultPrevented) return
  event.preventDefault()
  event.stopImmediatePropagation()
  entry.close()
}

function registerEscape(entry: EscapeEntry) {
  escapeStack.push(entry)
  if (escapeStack.length === 1) document.addEventListener('keydown', handleEscape)
  return () => {
    const index = escapeStack.lastIndexOf(entry)
    if (index >= 0) escapeStack.splice(index, 1)
    if (!escapeStack.length) document.removeEventListener('keydown', handleEscape)
  }
}

export const Dialog = D.Root
export const DialogTrigger = D.Trigger
export const DialogTitle = D.Title
export const DialogDescription = D.Description

function DialogSurface(props: ParentProps<{ entry: EscapeEntry, onOpenAutoFocus?: (event: Event) => void, onCloseAutoFocus?: (event: Event) => void }>) {
  const context = D.useDialogContext()
  let surface!: HTMLDivElement
  let parentLayer: HTMLElement | undefined
  let focusEpoch = 0
  const restoreFocus = (event: Event) => {
    if (!context.modal()) return
    // Kobalte's delayed modal restore ignores preventDefault on its callback.
    // Intercept the event before that handler so an old dialog cannot steal
    // focus from a reopened dialog or a newer native layer.
    event.stopImmediatePropagation()
    const currentLayer = topLayer()
    if (!context.isOpen() && focusEpoch === props.entry.focusEpoch && (!currentLayer || currentLayer === parentLayer)) {
      props.onCloseAutoFocus?.(event)
      if (!event.defaultPrevented) context.triggerRef()?.focus({ preventScroll: true })
    }
    event.preventDefault()
  }
  props.entry.surface = () => surface
  createEffect(() => ({ open: context.isOpen(), content: context.contentRef() }), ({ open, content }) => {
    if (!open || !content) return
    parentLayer = topLayer()
    focusEpoch = ++props.entry.focusEpoch
    // Keep this listener on detached content until its queued restore fires.
    content.addEventListener('focusTrap.finalFocus', restoreFocus, true)
    showLayer(surface)
    if (context.modal()) {
      // Kobalte defers autofocus by two animation frames, which can stall in a
      // background window. Enter the trap as soon as the native layer opens.
      const event = new CustomEvent('focusTrap.initialFocus', { cancelable: true })
      const onOpenAutoFocus = props.onOpenAutoFocus
      if (onOpenAutoFocus) content.addEventListener(event.type, onOpenAutoFocus, { once: true })
      content.dispatchEvent(event)
      if (!event.defaultPrevented) {
        const candidates = [...content.querySelectorAll<HTMLElement>('a[href], button, input, textarea, select, details, [tabindex]')]
          .filter(element => element.tabIndex >= 0 && !element.matches(':disabled, [hidden]') && !element.closest('[inert], [hidden]'))
          .sort((a, b) => (a.tabIndex || Infinity) - (b.tabIndex || Infinity))
        for (const target of [...candidates, content]) {
          target.focus({ preventScroll: true })
          if (content.contains(document.activeElement)) break
        }
      }
    }
    const unregister = registerEscape(props.entry)
    return () => {
      unregister()
      hideLayer(surface)
    }
  })
  return <div ref={surface} popover='manual' class='samey-dialog-layer'>{props.children}</div>
}

export function DialogContent(props: D.DialogContentProps & ComponentProps<'div'>) {
  const context = D.useDialogContext()
  const local = props, rest = omit(props, 'class', 'onEscapeKeyDown', 'onInteractOutside', 'onOpenAutoFocus', 'onCloseAutoFocus')
  const entry: EscapeEntry = { close: context.close, surface: () => undefined, focusEpoch: 0, onEscapeKeyDown: event => local.onEscapeKeyDown?.(event) }
  return <D.Portal>
    <DialogSurface entry={entry} onOpenAutoFocus={local.onOpenAutoFocus} onCloseAutoFocus={local.onCloseAutoFocus}>
      <D.Overlay data-samey-overlay-backdrop='' class='samey-dialog-overlay' />
      <D.Content data-samey-overlay='' class={['samey-dialog', local.class]} {...rest} aria-modal={context.modal() ? 'true' : undefined}
        onOpenAutoFocus={event => {
          if (context.modal()) event.preventDefault()
          else local.onOpenAutoFocus?.(event)
        }}
        onCloseAutoFocus={event => { if (!context.modal()) local.onCloseAutoFocus?.(event) }}
        onInteractOutside={event => {
          local.onInteractOutside?.(event)
          // Kobalte's stack cannot see newer native/runtime surfaces.
          if (!isTopLayer(entry.surface())) event.preventDefault()
        }} />
    </DialogSurface>
  </D.Portal>
}
