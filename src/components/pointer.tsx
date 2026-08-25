'use strict'

import { onCleanup, onMount } from 'solid-js'

import '../css/components/pointer.css'

export default function Pointer({POINTER_SIZE}: {POINTER_SIZE: number}) {
  const cursor = <div
    class='absolute top-0 left-0 z-[9999] rounded-full subpixel-antialiased will-change-transform transform-gpu transition-none'
    style={{
      'width': `${POINTER_SIZE}px`,
      'height': `${POINTER_SIZE}px`,
      'backdrop-filter': 'saturate(0%) brightness(1.25) invert(100%) contrast(1.75)',
    }}
  />

  function onMousemove(e: MouseEvent) {
    (cursor as HTMLDivElement).style.transform = `translate(calc(${e.clientX}px - 50%),calc(${e.clientY}px - 50%))`
  }

  onMount(() => {
    document.addEventListener('pointermove', onMousemove, true)
  })
  onCleanup(() => {
    document.removeEventListener('pointermove', onMousemove, true)
  })

  return <div class='absolute top-0 left-0 z-[9999] w-0 h-0 overflow-visible pointer-events-none select-none'>
    {cursor}
  </div>
}

