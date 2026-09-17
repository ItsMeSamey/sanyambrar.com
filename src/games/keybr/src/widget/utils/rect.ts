import { isNumber, isObjectLike } from "@keybr/lang";
import { Point, type TPoint } from "./point.ts";
import { Size, type TSize } from "./size.ts";

export type TRect = TPoint & TSize;

export class Rect implements Readonly<TRect> {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;

  constructor(x: number, y: number, width: number, height: number);
  constructor(point: Readonly<TPoint>, size: Readonly<TSize>);
  constructor(rect: Readonly<TRect>);
  constructor(...args: unknown[]) {
    if (args.length === 4 && args.every(isNumber)) {
      [this.x, this.y, this.width, this.height] = args as [number, number, number, number];
      return;
    }
    if (args.length === 2 && Point.isPoint(args[0]) && Size.isSize(args[1])) {
      this.x = args[0].x;
      this.y = args[0].y;
      this.width = args[1].width;
      this.height = args[1].height;
      return;
    }
    if (args.length === 1 && Rect.isRect(args[0])) {
      this.x = args[0].x;
      this.y = args[0].y;
      this.width = args[0].width;
      this.height = args[0].height;
      return;
    }
    throw new TypeError();
  }

  eq(that: Rect): boolean {
    return (
      this.x === that.x &&
      this.y === that.y &&
      this.width === that.width &&
      this.height === that.height
    );
  }

  round(): Rect {
    return new Rect(
      Math.round(this.x),
      Math.round(this.y),
      Math.round(this.width),
      Math.round(this.height),
    );
  }

  get cx(): number {
    return this.x + this.width / 2;
  }

  get cy(): number {
    return this.y + this.height / 2;
  }

  get left(): number {
    return Math.min(this.x, this.x + this.width);
  }

  get right(): number {
    return Math.max(this.x, this.x + this.width);
  }

  get top(): number {
    return Math.min(this.y, this.y + this.height);
  }

  get bottom(): number {
    return Math.max(this.y, this.y + this.height);
  }

  static isRect(o: unknown): o is TRect {
    return (
      isObjectLike(o) &&
      isNumber(o.x) &&
      isNumber(o.y) &&
      isNumber(o.width) &&
      isNumber(o.height)
    );
  }
}
