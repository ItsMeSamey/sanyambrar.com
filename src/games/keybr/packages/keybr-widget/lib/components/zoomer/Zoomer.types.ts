import { type Accessor } from 'solid-js';
import { type JSX } from '@solidjs/web';
export type ZoomerProps = {
  readonly children: JSX.Element | ((moving: Accessor<boolean>) => JSX.Element);
  readonly id?: string | null;
};
export type ZoomableProps = { readonly moving?: boolean };
export type ZoomablePosition = { readonly x: number; readonly y: number; readonly zoom: number };
