'use strict'

import { ComponentProps, createSignal, JSX, ValidComponent } from 'solid-js'
import { ConfigColorMode, createLocalStorageManager, PolymorphicProps, useColorMode } from '@kobalte/core'
import * as ToggleGroupPrimitive from '@kobalte/core/toggle-group'
import { VariantProps } from 'class-variance-authority'

import { ToggleGroup, ToggleGroupItem } from '~/registry/ui/toggle-group'
import { IconSun, IconMoon, IconLaptop } from '~/components/icons'
import { toggleVariants } from '~/registry/ui/toggle'

type ToggleGroupRootProps<T extends ValidComponent = 'div'> =
  ToggleGroupPrimitive.ToggleGroupRootProps<T> &
    VariantProps<typeof toggleVariants> & { class?: string | undefined; children?: JSX.Element }

function ToggleItem(Icon: (props: ComponentProps<"svg">) => JSX.Element, value: string, label: string) {
  return <ToggleGroupItem
    value={value}
    aria-label={label}
    class='w-9 px-0 group-data-[state=on]:bg-foreground transition-transform hover:bg-muted/50'
  >
    <Icon class='size-5 group-data-[state=on]:stroke-background' />
  </ToggleGroupItem>
}

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
      {ToggleItem(IconSun, 'light', 'Light Mode')}
      {ToggleItem(IconMoon, 'dark', 'Dark Mode')}
      {ToggleItem(IconLaptop, 'system', 'System Mode')}
    </ToggleGroup>
  )
}

