'use strict'

import { createSignal, ValidComponent } from 'solid-js'
import { ConfigColorMode, createLocalStorageManager, PolymorphicProps, useColorMode } from '@kobalte/core'
import * as ToggleGroupPrimitive from '@kobalte/core/toggle-group'
import { VariantProps } from 'class-variance-authority'

import { ToggleGroup, ToggleGroupItem } from '~/registry/ui/toggle-group'
import { IconSun, IconMoon, IconLaptop } from '~/components/icons'
import { toggleVariants } from '~/registry/ui/toggle'
import { JSX } from 'solid-js/h/jsx-runtime'


type ToggleGroupRootProps<T extends ValidComponent = 'div'> =
  ToggleGroupPrimitive.ToggleGroupRootProps<T> &
    VariantProps<typeof toggleVariants> & { class?: string | undefined; children?: JSX.Element }

export default function ModeToggleGroup<T extends ValidComponent = 'div'>(props: PolymorphicProps<T, ToggleGroupRootProps<T>>) {
  const { setColorMode } = useColorMode()
  const [colorState, setColorState] = createSignal<ConfigColorMode>(createLocalStorageManager('ui-theme').get() ?? 'system')

  return (
    <ToggleGroup
      onChange={(value) => {
        if (value) {
          setColorMode(value as ConfigColorMode)
          setColorState(value as ConfigColorMode)
        }
      }}
      {...props}
      value={colorState()}
      multiple={false}
    >
      <ToggleGroupItem value='light' aria-label='Light Mode' class='w-9 px-0 group-data-[state=on]:bg-muted/50'>
        <IconSun class='size-5' />
      </ToggleGroupItem>
      <ToggleGroupItem value='dark' aria-label='Dark Mode' class='w-9 px-0 group-data-[state=on]:bg-muted/50'>
        <IconMoon class='size-5' />
      </ToggleGroupItem>
      <ToggleGroupItem value='system' aria-label='System Mode' class='w-9 px-0 group-data-[state=on]:bg-muted/50'>
        <IconLaptop class='size-5' />
      </ToggleGroupItem>
    </ToggleGroup>
  )
}

