import { type CodePoint } from "@keybr/unicode";
import { type Keyboard } from "./keyboard.ts";
import { type KeyShape } from "./keyshape.ts";
import { type Ngram1, type Ngram2 } from "./ngram.ts";
import { type ZoneId } from "./types.ts";

export type KeyboardStats = {
  readonly homeRow: number;
  readonly topRow: number;
  readonly bottomRow: number;
  readonly handSwitches: number;
  readonly fingerSwitches: number;
};
