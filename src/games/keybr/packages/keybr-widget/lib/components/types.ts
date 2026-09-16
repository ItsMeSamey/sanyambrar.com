import type { JSX } from "@solidjs/web";
import type { ValidComponent } from "@solidjs/web";
export type FocusEventHandler<T extends Element = Element> = (event: FocusEvent & { currentTarget: T }) => void;
export type KeyboardEventHandler<T extends Element = Element> = (event: KeyboardEvent & { currentTarget: T }) => void;
export type MouseEventHandler<T extends Element = Element> = (event: MouseEvent & { currentTarget: T }) => void;
export type WheelEventHandler<T extends Element = Element> = (event: WheelEvent & { currentTarget: T }) => void;
export type ClassName = string | undefined;
export type ElementProps = {
    readonly as?: ValidComponent;
    readonly className?: ClassName;
    readonly id?: string;
    readonly title?: string;
    readonly children?: JSX.Element;
};
export type Focusable = {
    blur(): void;
    focus(): void;
};
export type Selectable = {
    select(): void;
};
export type FocusProps = {
    readonly tabIndex?: number;
    readonly disabled?: boolean;
    readonly onFocus?: FocusEventHandler;
    readonly onBlur?: FocusEventHandler;
};
export type MouseProps = {
    readonly onClick?: MouseEventHandler;
    readonly onMouseDown?: MouseEventHandler;
    readonly onMouseUp?: MouseEventHandler;
    readonly onMouseOver?: MouseEventHandler;
    readonly onMouseOut?: MouseEventHandler;
    readonly onMouseEnter?: MouseEventHandler;
    readonly onMouseLeave?: MouseEventHandler;
};
export type WheelProps = {
    readonly onWheel?: WheelEventHandler;
};
export type KeyboardProps = {
    readonly onKeyDown?: KeyboardEventHandler;
    readonly onKeyUp?: KeyboardEventHandler;
};
