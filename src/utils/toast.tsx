'use strict'

import { showToast } from '~/registry/ui/toast'

export function showError(e: Error) {
  console.error(e)
  showToast({
    title: e.name,
    description: e.message,
    variant: 'error',
    duration: 4000,
  })
}

export function stripStack(s: string): string {
  return s.split('\n##-STACK-##\n')[0]
}

