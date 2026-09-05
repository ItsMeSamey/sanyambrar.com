/* @refresh reload */
import { render } from 'solid-js/web'
import { ErrorBoundary, Match, Switch } from 'solid-js'
import StatsPage from './page_stats'

import './style.css'

import { mountPageNavigation, Page, selectP, setPageRoot } from '../../utils/navigation'
import ErrorPage from '../../pages/error_page'
import Wordle from './page'
import { Toaster } from '~/registry/ui/toast'

const disposePageNavigation = mountPageNavigation()
const mount = document.getElementById('wordle-app-mount')
if (!mount) throw new Error('Wordle mount node is missing')

const disposeWordle = render(function() {
  return <>
    <Toaster class='wordle-toaster' />

    <div ref={setPageRoot} data-wordle-root>
      <ErrorBoundary fallback={ErrorPage}>
        <Switch>
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
}, mount)


;globalThis.SameyWordleDispose = () => {
  disposePageNavigation()
  setPageRoot()
  disposeWordle()
  delete globalThis.SameyWordleDispose
}
