import { describe, expect, test } from 'bun:test';
import { createPointerPresses, isVirtualClick } from '../src/games/afterimage/press-input';

const touch = (pointerId: number) => ({ pointerId, pointerType: 'touch', button: 0, isPrimary: pointerId === 1 });

describe('Afterimage press routing', () => {
  test('overlapping fingers reach an ordered action stream before either release', () => {
    const presses = createPointerPresses(), actions: string[] = [];
    const press = (pointerId: number, tile: string) => { if (presses.down(touch(pointerId))) actions.push(tile); };
    press(1, 'first'); press(2, 'second'); press(2, 'duplicate');
    expect(actions).toEqual(['first', 'second']);
    presses.release(1);
    press(1, 'third');
    expect(actions).toEqual(['first', 'second', 'third']);
    presses.release(2); presses.release(1);
  });

  test('pointer cancellation and focus loss release ownership without manufacturing an action', () => {
    const presses = createPointerPresses();
    expect(presses.down(touch(1))).toBe(true);
    presses.release(1);
    expect(presses.down(touch(1))).toBe(true);
    expect(presses.down(touch(2))).toBe(true);
    presses.reset();
    expect(presses.down(touch(1))).toBe(true);
    expect(presses.down(touch(2))).toBe(true);
  });

  test('pointer compatibility clicks cannot become keyboard actions even with zero detail', () => {
    expect(isVirtualClick({ detail: 1 })).toBe(false);
    expect(isVirtualClick({ detail: 0, pointerType: 'touch' })).toBe(false);
    expect(isVirtualClick({ detail: 0, pointerType: 'pen' })).toBe(false);
    expect(isVirtualClick({ detail: 0, sourceCapabilities: { firesTouchEvents: true } })).toBe(false);
    expect(isVirtualClick({ detail: 0, pointerType: '' })).toBe(true);
    expect(isVirtualClick({ detail: 0 })).toBe(true);
    expect(createPointerPresses().down({ pointerId: 1, pointerType: 'mouse', button: 0, sourceCapabilities: { firesTouchEvents: true } })).toBe(false);
  });
});
