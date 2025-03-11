'use strict'

import { createSignal, JSX, onCleanup, onMount } from 'solid-js'

import '../css/pages/loading_screen.css'

function CoolFlow(text: string) {
  return <div class='flex flex-col items-center justify-center w-full h-full content-center'>
    <div class='__loading_cool_flow'>
      {text.split('').reverse().map((c, i) => (
        <div style={{
          'animation-delay': `${i * .1}s`,
          '-o-animation-delay': `${i * .1}s`,
          '-moz-animation-delay': `${i * .1}s`,
          '-webkit-animation-delay': `${i * .1}s`,
        }}>
          {c}
        </div>
      ))}
    </div>
  </div>
}

function UnblurFlow(text: string) {
  return <div class='__loading_unblur_flow'>
    <div>
      {text.split('').map((c, i) => (
        <span class='loading-text-words' style={{
          'animation': `__loading_unblur_flow_blur_text ${.2 * text.length}s ${.2 * i}s infinite linear alternate`
        }}>{c}</span>
      ))}
    </div>
  </div>
}

function RainbowSpin() {
  return <div class='__loading_rainbow_spin'>
    <div class='__loading_rainbow_spin_inner'>
      {Array(5).fill(null).map((_) => (
        <div class='__loading_rainbow_spin_line_wrap'>
          <div class='__loading_rainbow_spin_line' />
        </div>
      ))}
    </div>
  </div>
}

function RandomShapes(text: string) {
  const types = ['circle', 'semi_circle', 'square', 'triangle', 'triangle2', 'rectangle']
  const colors = ['#836ee5','#fe94b4','#49d2f5','#ff5354','#00b1b4','#ffe465','#0071ff','#03274b']

  const shapes = Array(3).fill(null).map(_ => <div class='__loading_random_shape' /> as HTMLDivElement)

  let interval: any
  const [str, setStr] = createSignal<string>(text)

  onMount(() => {
    interval = setInterval(() => {
      setStr(old => old.length >= text.length + 5? text: old + '.')
      for (const shape of shapes) {
        let cl = shape.classList
        shape.className = '__loading_random_shape'

        if(!cl.contains('__loading_random_shape_bounce_up')) cl.add('__loading_random_shape_bounce_up')
        cl.replace('__loading_random_shape_bounce_down', '__loading_random_shape_bounce_up')
        setTimeout(() => cl.replace('__loading_random_shape_bounce_up', '__loading_random_shape_bounce_down'), 400)

        cl.add('__loading_random_shape_' + types[~~(Math.random()*types.length)])
        let offset = ((Math.random()*4))-2
        let opp = offset >= 0 ? '+ ': '- '
        let styles = [
          ['left', 'calc(50% '+opp+offset+'vw)'],
          ['--bounce-variance', ((Math.random()*20))-10 + 'vh'],
          ['--base_scale', ((Math.random()*6))+4 + 'vh'],
          ['--rotation', ((Math.random()*180))-90 + 'deg'],
          ['--color', colors[~~(Math.random()*colors.length)]]
        ]
        styles.forEach(style => shape.style.setProperty(style[0], style[1]))
      }
    }, 750)
  })
  onCleanup(() => {
    clearInterval(interval)
  })

  return <div
    class='__loading_random_shape_parent w-full h-full'
    style={{'padding-bottom': 'var(--floor)'}}
  >
    {shapes}
    <div
      class='absolute w-full z-[-1] shadow-xl shadow-top text-center content-center text-3xl font-thin bg-gradient-to-b from-muted to-transparent'
      style={{'bottom': '0', 'height': 'var(--floor)'}}
    >
      {str()}
    </div>
  </div>
}


const functions = [CoolFlow, UnblurFlow, RainbowSpin, RandomShapes]
export default function LoadingScreen({pageString}: {pageString: string}): JSX.Element {
  return functions[Math.floor(Math.random() * functions.length)](pageString)
}

