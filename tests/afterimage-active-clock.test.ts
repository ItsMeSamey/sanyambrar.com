import { describe, expect, test } from 'bun:test';
import { ActiveCountdown } from '../src/games/afterimage/active-clock.ts';

describe('timed-game error pauses', () => {
  test('retains exact active time through an arbitrarily long correction', () => {
    const clock = new ActiveCountdown();
    clock.start(60000, 100);
    expect(clock.pause(15123.25)).toBe(44976.75);
    expect(clock.running).toBe(false);
    expect(clock.remaining(250000)).toBe(44976.75);
    clock.resume(250000);
    expect(clock.running).toBe(true);
    expect(clock.remaining(250000)).toBe(44976.75);
    expect(clock.remaining(294976.5)).toBe(0.25);
    expect(clock.remaining(294976.75)).toBe(0);
  });

  test('duplicate error or acknowledgment events cannot grant extra time', () => {
    const clock = new ActiveCountdown();
    clock.start(30000, 0);
    clock.pause(1234.5);
    clock.pause(99999);
    expect(clock.remaining(150000)).toBe(28765.5);
    clock.resume(150000);
    clock.resume(151000);
    expect(clock.remaining(151000)).toBe(27765.5);
    clock.pause(151000);
    clock.resume(200000);
    expect(clock.remaining(227765.5)).toBe(0);
  });

  test('a pause at the deadline cannot revive an expired run', () => {
    const clock = new ActiveCountdown();
    clock.start(60000, 0);
    expect(clock.pause(60000)).toBe(0);
    clock.resume(90000);
    expect(clock.running).toBe(false);
    expect(clock.remaining(90000)).toBe(0);
  });

  test('reset cancels retained time and a fresh start gets its own duration', () => {
    const clock = new ActiveCountdown();
    clock.start(60000, 0);
    clock.pause(10000);
    clock.reset();
    clock.resume(100000);
    expect(clock.running).toBe(false);
    expect(clock.remaining(100000)).toBe(0);
    clock.start(30000, 100000);
    expect(clock.remaining(100100)).toBe(29900);
    expect(clock.remaining(130000)).toBe(0);
    expect(clock.remaining(140000)).toBe(0);
  });
});
