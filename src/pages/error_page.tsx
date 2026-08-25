'use strict'

import { JSX, onCleanup, onMount, resetErrorBoundaries } from 'solid-js'

import '../css/pages/error_page.css'
import { Button } from '~/registry/ui/button'
import { stripStack } from '../utils/toast'

function SwingingLight(err: any, reset: () => void): JSX.Element {
  let interval: any
  let clicked = false
  function resetFn() {
    reset()
    resetErrorBoundaries()
  }

  function tryReset() {
    if (interval !== undefined) clearInterval(interval)
    interval = setInterval(resetFn, 10)
  }

  const homeButton = document.getElementById('__home_button')
  function clickListener(e: MouseEvent) {
    if (homeButton?.contains(e.target as Node)) {
      tryReset()
    }
  }

  onMount(() => {
    document.addEventListener('click', clickListener)
  })
  onCleanup(() => {
    document.removeEventListener('click', clickListener)
    if (interval !== undefined) clearInterval(interval)
  })


  return <div class='__error_page_swinging_light_parent'>
    <h1 class='__error_page_swinging_light_text'>Oops</h1>
    <div class='__error_page_swinging_light_cloak_wrapper'>
      <div class='__error_page_swinging_light_cloak_container'>
        <div class='__error_page_swinging_light_cloak' />
      </div>
    </div>
    <div class='text-center justify-center items-center mt-14 text-white/50 z-10'>
      <span class='font-bold p-8 text-2xl text-red-500/50'>Something's Gone Horridly Wrong!</span>
      <p class='text-center text-xl'>{err.name}: {stripStack(err.message)}</p>
      <div class='flex flex-row items-center justify-center p-1 gap-4 mt-8'>
        <Button class='rounded-full' onClick={() => {
          if (!clicked) {
            clicked = true
            window.history.back()
          }
          tryReset()
        }}>Go Back</Button>
        <Button class='rounded-full' onClick={reset}>Try Again</Button>
      </div>
    </div>
  </div>
}

export default function ErrorPage(err: any, reset: () => void): JSX.Element {
  return SwingingLight(err, reset)
}

