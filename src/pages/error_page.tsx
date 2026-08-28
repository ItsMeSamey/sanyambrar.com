'use strict'

import { JSX, resetErrorBoundaries } from 'solid-js'

import '../css/pages/error_page.css'
import { Button } from '~/registry/ui/button'
import { stripStack } from '../utils/toast'

function SwingingLight(err: any, reset: () => void): JSX.Element {
  const retry = () => { reset(); resetErrorBoundaries() }
  return <div class='__error_page_swinging_light_parent'>
    <h1 class='__error_page_swinging_light_text'>Oops</h1>
    <div class='__error_page_swinging_light_cloak_wrapper'>
      <div class='__error_page_swinging_light_cloak_container'>
        <div class='__error_page_swinging_light_cloak' />
      </div>
    </div>
    <div class='error-page-message'>
      <strong class='error-page-heading'>Something's Gone Horridly Wrong!</strong>
      <p class='error-page-detail'>{err.name}: {stripStack(err.message)}</p>
      <div class='error-page-actions'>
        <Button class='rounded-full' onClick={() => { history.back(); retry() }}>Go Back</Button>
        <Button class='rounded-full' onClick={retry}>Try Again</Button>
      </div>
    </div>
  </div>
}

export default function ErrorPage(err: any, reset: () => void): JSX.Element {
  return SwingingLight(err, reset)
}
