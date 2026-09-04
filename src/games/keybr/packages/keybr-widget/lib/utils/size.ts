import { isNumber, isObjectLike } from "@keybr/lang";

export type TSize = {
  width: number;
  height: number;
};

export class Size implements Readonly<TSize> {
  readonly width: number;
  readonly height: number;

  constructor(width: number, height: number);
  constructor(size: Readonly<TSize>);
  constructor(...args: unknown[]) {
    if (args.length === 2 && isNumber(args[0]) && isNumber(args[1])) {
      this.width = args[0];
      this.height = args[1];
      return;
    }
    if (args.length === 1 && Size.isSize(args[0])) {
      this.width = args[0].width;
      this.height = args[0].height;
      return;
    }
    throw new TypeError();
  }

  eq(that: Size): boolean {
    return this.width === that.width && this.height === that.height;
  }

  round(): Size {
    return new Size(Math.round(this.width), Math.round(this.height));
  }

  static isSize(o: unknown): o is TSize {
    return isObjectLike(o) && isNumber(o.width) && isNumber(o.height);
  }
}
