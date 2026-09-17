import { type KeyId } from "../keyboard/types.ts";
import { type CodePoint } from "../unicode/types.ts";

export type InputListener = {
  readonly onKeyDown: (event: IKeyboardEvent) => void;
  readonly onKeyUp: (event: IKeyboardEvent) => void;
  readonly onInput: (event: IInputEvent) => void;
};

export type IKeyboardEvent = {
  readonly type: "keydown" | "keyup";
  readonly timeStamp: number;
  readonly code: KeyId;
  readonly key: string;
  readonly modifiers: readonly ModifierId[];
};

export type ModifierId =
  | "CapsLock"
  | "NumLock"
  | "Control"
  | "Shift"
  | "Alt"
  | "AltGraph"
  | "Meta";

export type IInputEvent = {
  readonly type: "input";
  readonly timeStamp: number;
  readonly inputType:
    | "appendChar"
    | "appendLineBreak"
    | "clearChar"
    | "clearWord";
  readonly codePoint: CodePoint;
  readonly timeToType: number;
};
