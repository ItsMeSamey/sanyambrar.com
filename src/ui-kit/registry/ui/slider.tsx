import * as S from '@kobalte/core/slider'
import { splitProps, type ComponentProps } from 'solid-js'
import { cn } from '~/lib/utils'

export const Slider = S.Root
export const SliderLabel = S.Label
export const SliderValueLabel = S.ValueLabel

export function SliderTrack(props: ComponentProps<typeof S.Track>) {
  const [local, rest] = splitProps(props, ['class'])
  return <S.Track class={cn('relative h-4 w-full grow rounded-full bg-secondary', local.class)} {...rest} />
}

export function SliderFill(props: ComponentProps<typeof S.Fill>) {
  const [local, rest] = splitProps(props, ['class'])
  return <S.Fill class={cn('absolute h-full rounded-full bg-primary', local.class)} {...rest} />
}

export function SliderThumb(props: ComponentProps<typeof S.Thumb>) {
  const [local, rest] = splitProps(props, ['class'])
  return <S.Thumb class={cn('block size-4 rounded-full border-2 border-primary bg-background opacity-0 shadow-none outline-none transition-opacity group-hover:opacity-100 focus-visible:opacity-100 data-[dragging]:opacity-100', local.class)} {...rest} />
}
