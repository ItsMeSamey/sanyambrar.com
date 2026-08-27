/* @refresh reload */
import { render } from 'solid-js/web'
import { ColorModeProvider, ColorModeScript, createLocalStorageManager } from '@kobalte/core'
import { ErrorBoundary, Match, Switch } from 'solid-js'
import StatsPage from './game/page_stats'

import './css/index.css'

import { NoPageError, Page, selectP } from './utils/navigation'
import ErrorPage from './pages/error_page'
import Wordle from './game/page'
import { Toaster } from '~/registry/ui/toast'

const disposeWordle = render(function() {
  const storageManager = createLocalStorageManager('ui-theme')
  return <ColorModeProvider initialColorMode='system' disableTransitionOnChange={false} storageManager={storageManager}>
    <ColorModeScript storageType={storageManager.type} />
    <Toaster class='max-sm:left-0' />

    <div id='wordle-root'>
      <div id='wordle-view-root'>
        <ErrorBoundary fallback={ErrorPage}>
          <Switch fallback={ErrorPage(NoPageError.err, NoPageError.reset)}>
            <Match when={selectP(Page.Wordle)}>
              <Wordle />
            </Match>
            <Match when={selectP(Page.Stats)}>
              <StatsPage />
            </Match>
          </Switch>
        </ErrorBoundary>
      </div>
    </div>

  </ColorModeProvider>
}, document.body)


;(globalThis as any).SameyWordleDispose = () => { disposeWordle(); delete (globalThis as any).SameyWordleDispose }
