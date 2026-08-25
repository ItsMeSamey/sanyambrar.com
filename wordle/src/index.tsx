/* @refresh reload */
import { render } from 'solid-js/web'
import { ColorModeProvider, ColorModeScript, createLocalStorageManager } from '@kobalte/core'
import { ErrorBoundary, Match, Switch } from 'solid-js'
import StatsPage from './game/page_stats'

import './css/index.css'

import { NoPageError, Page, selectP } from './utils/navigation'
import ErrorPage from './pages/error_page'
import Wordle from './game/page'
import SharePage from './game/page_share'
import { Toaster } from '~/registry/ui/toast'

render(function() {
  const storageManager = createLocalStorageManager('ui-theme')
  return <ColorModeProvider initialColorMode='system' disableTransitionOnChange={false} storageManager={storageManager}>
    <ColorModeScript storageType={storageManager.type} />
    <Toaster class='max-sm:left-0' />

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

