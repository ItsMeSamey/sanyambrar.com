/* @refresh reload */
import { render } from '@solidjs/web'
import { Errored, Match, Switch, type Accessor } from 'solid-js';
import StatsPage from './page_stats'

import './style.css'

import { mountPageNavigation, Page, selectP, setPageRoot } from './navigation'
import Wordle from './page'
import { Button } from '../../shared/components/Button.tsx'
import { Toaster } from '../../shared/components/Toast.tsx'

function ErrorPage(error: Accessor<unknown>, reset: () => void) {
  const value = error()
  const err = value instanceof Error ? value : new Error(String(value))
  return <div class='__error_page_swinging_light_parent'>
    <h1 class='__error_page_swinging_light_text'>Oops</h1>
    <div class='__error_page_swinging_light_cloak_wrapper'>
      <div class='__error_page_swinging_light_cloak_container'>
        <div class='__error_page_swinging_light_cloak' />
      </div>
    </div>
    <div class='error-page-message'>
      <strong class='error-page-heading'>Something's Gone Horridly Wrong!</strong>
      <p class='error-page-detail'>{err.name}: {err.message.split('\n##-STACK-##\n')[0]}</p>
      <div class='error-page-actions'>
        <Button class='rounded-full' onClick={() => { history.back(); reset() }}>Go Back</Button>
        <Button class='rounded-full' onClick={reset}>Try Again</Button>
      </div>
    </div>
  </div>
}

const disposePageNavigation = mountPageNavigation()
const mount = document.getElementById('wordle-app-mount')
if (!mount) throw new Error('Wordle mount node is missing')

const disposeWordle = render(function() {
  return <>
    <Toaster class='wordle-toaster' />

    <div ref={setPageRoot} data-wordle-root>
      <Errored fallback={ErrorPage}>
        <Switch>
          <Match when={selectP(Page.Wordle)}>
            <Wordle />
          </Match>
          <Match when={selectP(Page.Stats)}>
            <StatsPage />
          </Match>
        </Switch>
      </Errored>
    </div>

  </>
}, mount)


;globalThis.SameyWordleDispose = () => {
  disposePageNavigation()
  setPageRoot()
  disposeWordle()
  delete globalThis.SameyWordleDispose
}
