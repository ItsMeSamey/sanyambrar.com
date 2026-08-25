'use strict'

import { ComponentProps, createSignal, JSX, Match, Switch } from 'solid-js'
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

function capatalizeFirst(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export default function ModeToggleDropDown(props: DropdownMenuRootProps) {
  const { setColorMode } = useColorMode()
  const [colorState, setColorState] = createSignal<ConfigColorMode>(createLocalStorageManager('ui-theme').get() ?? 'system')

  function MenuItem(Icon: (props: ComponentProps<"svg">) => JSX.Element, value: string) {
    return <DropdownMenuItem onSelect={() => {
      setColorMode(value as ConfigColorMode)
      setColorState(value as ConfigColorMode)
    }} class={colorState() === value? 'bg-muted/50': ''}>
      <Icon class='mr-2 size-4'/>
      <span>{capatalizeFirst(value)}</span>
    </DropdownMenuItem>
  }

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
        {MenuItem(IconSun, 'light')}
        {MenuItem(IconMoon, 'dark')}
        {MenuItem(IconLaptop, 'system')}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

