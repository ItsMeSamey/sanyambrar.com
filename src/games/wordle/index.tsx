/* @refresh reload */
import { render } from 'solid-js/web'
import { ErrorBoundary, Match, Switch } from 'solid-js'
import StatsPage from './page_stats'

import './style.css'

import { mountPageNavigation, NoPageError, Page, selectP } from '../../utils/navigation'
import ErrorPage from '../../pages/error_page'
import Wordle from './page'
import { Toaster } from '~/registry/ui/toast'

const disposePageNavigation = mountPageNavigation()

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
