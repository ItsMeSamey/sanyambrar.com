/* @refresh reload */
import { render } from 'solid-js/web'
import { ColorModeProvider, ColorModeScript, createLocalStorageManager } from '@kobalte/core'
import { ErrorBoundary, Match, Switch } from 'solid-js'
import { Toaster } from '~/registry/ui/toast'

import './css/index.css'

import { NoPageError, Page, selectP } from './utils/navigation'
import ErrorPage from './pages/error_page'
import Pointer from './components/pointer'
import Wordle from './game/page'

render(function() {
  const storageManager = createLocalStorageManager('ui-theme')
  const isTouch = window.matchMedia('(pointer: coarse)').matches

  return <ColorModeProvider initialColorMode='system' disableTransitionOnChange={false} storageManager={storageManager}>
    <ColorModeScript storageType={storageManager.type} />
    <Toaster />
    {isTouch || <Pointer POINTER_SIZE={20} />}

    <ErrorBoundary fallback={ErrorPage}>
      <Switch fallback={ErrorPage(NoPageError.err, NoPageError.reset)}>
        <Match when={selectP(Page.Wordle)}>
          <Wordle />
        </Match>
      </Switch>
    </ErrorBoundary>

  </ColorModeProvider>
}, document.body)

