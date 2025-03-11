'use strict'

import { createSignal, Match, Switch } from 'solid-js'
import { ConfigColorMode, createLocalStorageManager, useColorMode } from '@kobalte/core'
import { Button } from '~/registry/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '~/registry/ui/dropdown-menu'

import { IconSun, IconMoon, IconLaptop } from '~/components/icons'
import { DropdownMenuRootProps } from '@kobalte/core/dropdown-menu'

export default function ModeToggleDropDown(props: DropdownMenuRootProps) {
  const { setColorMode } = useColorMode()
  const [colorState, setColorState] = createSignal<ConfigColorMode>(createLocalStorageManager('ui-theme').get() ?? 'system')

  return (
    <DropdownMenu {...props}>
      <DropdownMenuTrigger as={Button<'button'>} variant='ghost' size='sm' class='w-9 px-0'>
        <Switch>
          <Match when={colorState() === 'light'}>
            <IconSun class='size-6' />
          </Match>
          <Match when={colorState() === 'dark'}>
            <IconMoon class='size-6' />
          </Match>
          <Match when={colorState() === 'system'}>
            <IconLaptop class='size-6' />
          </Match>
        </Switch>
      </DropdownMenuTrigger>
      <DropdownMenuContent class='border-muted absolute overflow-visible'>
        <DropdownMenuItem onSelect={() => {
          setColorMode('light')
          setColorState('light')
        }} class={colorState() === 'light'? 'bg-muted/50': ''}>
          <IconSun class='mr-2 size-4'/>
          <span>Light</span>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => {
          setColorMode('dark')
          setColorState('dark')
        }} class={colorState() === 'dark'? 'bg-muted/50': ''}>
          <IconMoon class='mr-2 size-4'/>
          <span>Dark</span>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => {
          setColorMode('system')
          setColorState('system')
        }} class={colorState() === 'system'? 'bg-muted/50': ''}>
          <IconLaptop class='mr-2 size-4'/>
          <span>System</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

