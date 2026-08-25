'use strict'

export async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export class Timer {
  private start: number = 0

  constructor() {
    this.start = performance.now()
  }

  get elapsed(): number {
    return performance.now() - this.start
  }

  reset(): void {
    this.start = performance.now()
  }

  getReset(): number {
    const now = performance.now()
    const delta = now - this.start
    this.start = now
    return delta
  }
}

