import { isNumber, isObjectLike } from "@keybr/lang";
import {
  type Hsl,
  type Hsv,
  type Hwb,
  type Oklab,
  type Oklch,
} from "./types.ts";

export const isHsl = (o: unknown): o is Hsl => {
  return (
    isObjectLike(o) &&
    isNumber(o.h) &&
    isNumber(o.s) &&
    isNumber(o.l) &&
    isNumber(o.alpha)
  );
};

export const isHsv = (o: unknown): o is Hsv => {
  return (
    isObjectLike(o) &&
    isNumber(o.h) &&
    isNumber(o.s) &&
    isNumber(o.v) &&
    isNumber(o.alpha)
  );
};

export const isHwb = (o: unknown): o is Hwb => {
  return (
    isObjectLike(o) &&
    isNumber(o.h) &&
    isNumber(o.w) &&
    isNumber(o.b) &&
    isNumber(o.alpha)
  );
};

export const isOklab = (o: unknown): o is Oklab => {
  return (
    isObjectLike(o) &&
    isNumber(o.l) &&
    isNumber(o.a) &&
    isNumber(o.b) &&
    isNumber(o.alpha)
  );
};

export const isOklch = (o: unknown): o is Oklch => {
  return (
    isObjectLike(o) &&
    isNumber(o.l) &&
    isNumber(o.c) &&
    isNumber(o.h) &&
    isNumber(o.alpha)
  );
};
