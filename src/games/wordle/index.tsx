/* @refresh reload */
import { render } from 'solid-js/web'
import { ErrorBoundary, Match, Switch } from 'solid-js'
import StatsPage from './page_stats'

import './style.css'

import { mountPageNavigation, NoPageError, Page, selectP, setPageRoot } from '../../utils/navigation'
import ErrorPage from '../../pages/error_page'
import Wordle from './page'
import { Toaster } from '~/registry/ui/toast'

const disposePageNavigation = mountPageNavigation()

const disposeWordle = render(function() {
  return <>
    <Toaster class='wordle-toaster' />

    <div ref={setPageRoot} data-wordle-root>
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

  </>
}, document.getElementById('wordle-app-mount')!)


;globalThis.SameyWordleDispose = () => {
  disposePageNavigation()
  setPageRoot()
  disposeWordle()
  delete globalThis.SameyWordleDispose
}
