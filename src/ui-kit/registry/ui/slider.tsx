import * as S from '@kobalte/core/slider'
import { splitProps, type ComponentProps } from 'solid-js'
import { cx } from '~/lib/classes'

export const Slider = S.Root
export const SliderLabel = S.Label
export const SliderValueLabel = S.ValueLabel

export function SliderTrack(props: ComponentProps<typeof S.Track>) {
  const [local, rest] = splitProps(props, ['class'])
  return <S.Track class={cx('samey-slider-track', local.class)} {...rest} />
}

export function SliderFill(props: ComponentProps<typeof S.Fill>) {
  const [local, rest] = splitProps(props, ['class'])
  return <S.Fill class={cx('samey-slider-fill', local.class)} {...rest} />
}

export function SliderThumb(props: ComponentProps<typeof S.Thumb>) {
  const [local, rest] = splitProps(props, ['class'])
  return <S.Thumb class={cx('samey-slider-thumb', local.class)} {...rest} />
}
