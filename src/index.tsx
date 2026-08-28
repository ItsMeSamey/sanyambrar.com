/* @refresh reload */
import { render } from 'solid-js/web'
import { ErrorBoundary, Match, Switch } from 'solid-js'
import StatsPage from './game/page_stats'

import './css/index.css'

import { disposePageNavigation, NoPageError, Page, selectP } from './utils/navigation'
import ErrorPage from './pages/error_page'
import Wordle from './game/page'
import { Toaster } from '~/registry/ui/toast'

const disposeWordle = render(function() {
  return <>
    <Toaster class='wordle-toaster' />

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

  </>
}, document.getElementById('wordle-app-mount')!)


;(globalThis as any).SameyWordleDispose = () => {
  disposePageNavigation()
  disposeWordle()
  delete (globalThis as any).SameyWordleDispose
}
