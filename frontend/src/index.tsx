/* @refresh reload */
import { Portal, render } from 'solid-js/web'
import { ColorModeProvider, ColorModeScript, createLocalStorageManager, PolymorphicProps } from '@kobalte/core'
import { ErrorBoundary, Match, Show, splitProps, Switch, ValidComponent } from 'solid-js'
import StatsPage from './game/page_stats'

import './css/index.css'

import { NoPageError, Page, selectP } from './utils/navigation'
import ErrorPage from './pages/error_page'
import Pointer from './components/pointer'
import Wordle from './game/page'
import SharePage from './game/page_share'

import * as ToastPrimitive from "@kobalte/core/toast"
import { cn } from '~/lib/utils'

type ToastListProps<T extends ValidComponent = "ol"> = ToastPrimitive.ToastListProps<T> & {
  class?: string | undefined
}

const Toaster = <T extends ValidComponent = "ol">(
  props: PolymorphicProps<T, ToastListProps<T>>
) => {
  const [local, others] = splitProps(props as ToastListProps, ["class"])
  return (
    <Portal>
      <ToastPrimitive.Region>
        <ToastPrimitive.List
          class={cn(
            "fixed top-0 max-sm:left-0 z-[100] flex max-h-screen w-full flex-col-reverse gap-2 p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]",
            local.class
          )}
          {...others}
        />
      </ToastPrimitive.Region>
    </Portal>
  )
}

render(function() {
  const storageManager = createLocalStorageManager('ui-theme')
  const isTouch = window.matchMedia('(pointer: coarse)').matches

  return <ColorModeProvider initialColorMode='system' disableTransitionOnChange={false} storageManager={storageManager}>
    <ColorModeScript storageType={storageManager.type} />
    <Show when={!isTouch}>
      <Pointer POINTER_SIZE={20} />
    </Show>
    <Toaster />

    <ErrorBoundary fallback={ErrorPage}>
      <Switch fallback={ErrorPage(NoPageError.err, NoPageError.reset)}>
        <Match when={selectP(Page.Wordle)}>
          <Wordle />
        </Match>
        <Match when={selectP(Page.Stats)}>
          <StatsPage />
        </Match>
        <Match when={selectP(Page.Share)}>
          <SharePage />
        </Match>
      </Switch>
    </ErrorBoundary>

  </ColorModeProvider>
}, document.body)

