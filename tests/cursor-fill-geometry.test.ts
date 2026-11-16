import { expect, test } from 'bun:test';
import { containCursorFill, cursorFillClip, cursorFillInset } from '../src/shared/cursorFillGeometry.ts';

test('zero-padding controls fill the text edge while original links retain their inset', () => {
  expect(cursorFillInset(8, 0)).toBe(0);
  expect(cursorFillInset(8)).toBe(8);
  expect(cursorFillInset(6)).toBe(6);
  expect(cursorFillInset(8, 20)).toBe(8);
});

test('inset plus extreme pointer lean never reaches a semantic control content box', () => {
  for (const width of [28, 52, 296, 600]) for (const padding of [0, 2, 5, 10, 12, 22]) {
    const inset = cursorFillInset(Math.min(8, Math.max(2, width * .04)), padding);
    const fillWidth = Math.min(width, Math.max(16.8, width - inset * 2));
    for (const pointer of [-1, 0, 1]) {
      const shift = pointer * Math.min(12, fillWidth * .08, (width - fillWidth) / 2);
      const leftInset = (width - fillWidth) / 2 + shift;
      const rightInset = (width - fillWidth) / 2 - shift;
      expect(leftInset).toBeLessThanOrEqual(padding + 1e-9);
      expect(rightInset).toBeLessThanOrEqual(padding + 1e-9);
    }
  }
});

test('every easing frame stays inside its owner through large/small and edge handoffs', () => {
  let shape = { x: 150, y: 120, width: 280, height: 180 };
  for (const owner of [
    { left: 600, top: 40, width: 28, height: 24 },
    { left: -12, top: 80, width: 600, height: 400 },
    { left: 300, top: 200, width: 4, height: 6 },
    { left: 60, top: 120, width: 240, height: 160 },
  ]) {
    for (const edge of [-1, 1]) for (let frame = 0; frame < 90; frame++) {
      shape = containCursorFill({
        x: shape.x + (owner.left + (edge < 0 ? 0 : owner.width) - shape.x) * .32,
        y: shape.y + (owner.top + (edge < 0 ? 0 : owner.height) - shape.y) * .32,
        width: shape.width + (owner.width - shape.width) * .24,
        height: shape.height + (owner.height - shape.height) * .24,
      }, owner);
      expect(shape.x - shape.width / 2).toBeGreaterThanOrEqual(owner.left - 1e-9);
      expect(shape.y - shape.height / 2).toBeGreaterThanOrEqual(owner.top - 1e-9);
      expect(shape.x + shape.width / 2).toBeLessThanOrEqual(owner.left + owner.width + 1e-9);
      expect(shape.y + shape.height / 2).toBeLessThanOrEqual(owner.top + owner.height + 1e-9);
    }
  }
});

test('equal-sized handoff carries the expanded geometry without painting the gap', () => {
  const shape = containCursorFill({ x: 180, y: 200, width: 224, height: 148 }, { left: 460, top: 120, width: 240, height: 160 });
  expect(shape).toEqual({ x: 572, y: 200, width: 224, height: 148 });
});

test('corner clipping remains anchored to the actual owner as the fill moves', () => {
  const owner = { left: 100, top: 80, width: 240, height: 160 };
  const radii = '24px 0px 7px 12px / 18px 0px 7px 10px';
  expect(cursorFillClip({ x: 220, y: 160, width: 224, height: 148 }, owner, radii))
    .toBe(`inset(-6px -8px -6px -8px round ${radii})`);
  expect(cursorFillClip({ x: 108, y: 88, width: 16, height: 16 }, owner, radii))
    .toBe(`inset(0px -224px -144px 0px round ${radii})`);
});
