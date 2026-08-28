import { type Accessor, type JSX } from "solid-js";
export type ZoomerProps = {
  readonly children: JSX.Element | ((moving: Accessor<boolean>) => JSX.Element);
  readonly id?: string | null;
};
export type ZoomableProps = { readonly moving?: boolean };
export type ZoomablePosition = { readonly x: number; readonly y: number; readonly zoom: number };
