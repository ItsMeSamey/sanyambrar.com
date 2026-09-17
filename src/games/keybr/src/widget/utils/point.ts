import { isNumber, isObjectLike } from "@keybr/lang";

export type TPoint = {
  x: number;
  y: number;
};

export class Point implements Readonly<TPoint> {
  readonly x: number;
  readonly y: number;

  constructor(x: number, y: number);
  constructor(point: Readonly<TPoint>);
  constructor(...args: unknown[]) {
    if (args.length === 2 && isNumber(args[0]) && isNumber(args[1])) {
      this.x = args[0];
      this.y = args[1];
      return;
    }
    if (args.length === 1 && Point.isPoint(args[0])) {
      this.x = args[0].x;
      this.y = args[0].y;
      return;
    }
    throw new TypeError();
  }

  eq(that: Point): boolean {
    return this.x === that.x && this.y === that.y;
  }

  round(): Point {
    return new Point(Math.round(this.x), Math.round(this.y));
  }

  static isPoint(o: unknown): o is TPoint {
    return isObjectLike(o) && isNumber(o.x) && isNumber(o.y);
  }
}
