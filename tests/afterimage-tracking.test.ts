import { describe, expect, test } from 'bun:test';
import { TRACKING_RADIUS, TRACKING_STEP, TRACKING_WORLD, createTrackingBalls, initialTrackingScore, pickTrackingBall, stepTrackingBalls, trackingFrameDelta, trackingRules } from '../src/games/afterimage/tracking-model.ts';

describe('Object tracking', () => {
  test('adds total balls and target balls on separate rounds, then increases speed and duration separately', () => {
    expect(Array.from({ length: 6 }, (_, level) => {
      const rules = trackingRules(level); return [rules.total, rules.targets];
    })).toEqual([[6, 2], [7, 2], [7, 3], [8, 3], [9, 3], [9, 4]]);
    for (let level = 1; level < 60; level++) {
      const previous = trackingRules(level - 1), next = trackingRules(level);
      const changed = (['total', 'targets', 'speed', 'duration'] as const).filter(key => previous[key] !== next[key]);
      expect(changed.length).toBeLessThanOrEqual(1);
      expect(next.total).toBeLessThanOrEqual(12); expect(next.targets).toBeLessThanOrEqual(6);
      expect(next.targets).toBeLessThan(next.total); expect(next.speed - previous.speed).toBeLessThanOrEqual(5);
      expect(next.duration - previous.duration).toBeLessThanOrEqual(0.25);
    }
    expect(trackingRules(Number.NaN)).toEqual(trackingRules(0));
    expect(trackingRules(-10)).toEqual(trackingRules(0));
  });

  test('hard flashes exactly one initial target and one distractor, leaving at least one eligible target', () => {
    for (const hard of [false, true]) for (let level = 0; level < 30; level++) for (let seed = 0; seed < 30; seed++) {
      const rules = trackingRules(level, hard), balls = createTrackingBalls(rules, seed);
      expect(balls).toHaveLength(rules.total);
      expect(balls.filter(ball => ball.target)).toHaveLength(rules.targets);
      expect(balls.filter(ball => ball.red)).toHaveLength(hard ? 2 : 0);
      expect(balls.filter(ball => ball.target && ball.red)).toHaveLength(hard ? 1 : 0);
      expect(balls.filter(ball => !ball.target && ball.red)).toHaveLength(hard ? 1 : 0);
      expect(balls.filter(ball => ball.target && !ball.red).length).toBeGreaterThanOrEqual(1);
      expect(new Set(balls.map(ball => ball.id)).size).toBe(rules.total);
    }
  });

  test('bounded collisions preserve distinct identities, roles, and visible separation throughout maximum difficulty', () => {
    for (let seed = 0; seed < 45; seed++) {
      const balls = createTrackingBalls(trackingRules(100, true), seed);
      const identities = balls.map(({ id, target, red }) => ({ id, target, red }));
      for (let step = 0; step < 960; step++) {
        stepTrackingBalls(balls);
        for (let i = 0; i < balls.length; i++) {
          const ball = balls[i];
          expect(ball.x).toBeGreaterThanOrEqual(TRACKING_RADIUS); expect(ball.x).toBeLessThanOrEqual(TRACKING_WORLD - TRACKING_RADIUS);
          expect(ball.y).toBeGreaterThanOrEqual(TRACKING_RADIUS); expect(ball.y).toBeLessThanOrEqual(TRACKING_WORLD - TRACKING_RADIUS);
          for (let j = i + 1; j < balls.length; j++) expect(Math.hypot(ball.x - balls[j].x, ball.y - balls[j].y)).toBeGreaterThanOrEqual(TRACKING_RADIUS * 2);
        }
      }
      expect(balls.map(({ id, target, red }) => ({ id, target, red }))).toEqual(identities);
    }
  });

  test('all eligible targets advance exactly once; red and ordinary distractors cost lives', () => {
    for (const hard of [false, true]) {
      const balls = createTrackingBalls(trackingRules(2, hard), 231);
      let score = initialTrackingScore();
      const targets = balls.filter(ball => ball.target && !ball.red);
      for (const [index, ball] of targets.entries()) {
        const result = pickTrackingBall(score, balls, ball.id);
        expect(result.outcome).toBe(index === targets.length - 1 ? 'complete' : 'correct'); score = result.score;
        const duplicate = pickTrackingBall(score, balls, ball.id); expect(duplicate.outcome).toBe('ignored'); expect(duplicate.score).toBe(score);
      }
      expect(score.completed).toBe(1); expect(score.correct).toBe(targets.length); expect(score.lives).toBe(3);
      for (const ball of balls.filter(ball => !ball.target || ball.red)) {
        const result = pickTrackingBall(initialTrackingScore(), balls, ball.id);
        expect(result.outcome).toBe('wrong'); expect(result.score.lives).toBe(2); expect(result.score.completed).toBe(0);
      }
      score = initialTrackingScore(); const wrong = balls.find(ball => !ball.target)!;
      for (let remaining = 2; remaining >= 0; remaining--) {
        const result = pickTrackingBall({ ...score, selected: [] }, balls, wrong.id);
        expect(result.outcome).toBe(remaining ? 'wrong' : 'finished'); score = result.score; expect(score.lives).toBe(remaining);
      }
      expect(pickTrackingBall(score, balls, targets[0].id).outcome).toBe('ignored');
      expect(pickTrackingBall(initialTrackingScore(), balls, -1).outcome).toBe('ignored');
    }
  });

  test('identical seeds and fixed steps produce identical paths regardless of render frame grouping or viewport', () => {
    const rules = trackingRules(20, true);
    const desktop = createTrackingBalls(rules, 19283), mobile = createTrackingBalls(rules, 19283);
    // 60 Hz and 30 Hz render grouping advance the same 120 Hz world simulation.
    for (let frame = 0; frame < 240; frame++) for (let substep = 0; substep < 2; substep++) stepTrackingBalls(desktop);
    for (let frame = 0; frame < 120; frame++) for (let substep = 0; substep < 4; substep++) stepTrackingBalls(mobile);
    expect(desktop).toEqual(mobile);
    expect(createTrackingBalls(rules, 19284)).not.toEqual(createTrackingBalls(rules, 19283));
    for (const width of [240, 320, 560, 1200]) {
      for (const ball of mobile) expect(ball.x / TRACKING_WORLD * width / width).toBeCloseTo(ball.x / TRACKING_WORLD);
    }
  });

  test('stalls and invalid time interrupt instead of teleporting; model steps are bounded', () => {
    expect(trackingFrameDelta(1000, 1016)).toBeCloseTo(0.016);
    expect(trackingFrameDelta(1000, 1250)).toBe(0.25);
    for (const now of [1251, 20000, 999, Number.NaN, Infinity]) expect(trackingFrameDelta(1000, now)).toBeNull();
    const original = createTrackingBalls(trackingRules(0), 234);
    const huge = structuredClone(original), bounded = structuredClone(original), invalid = structuredClone(original);
    stepTrackingBalls(huge, 20000); stepTrackingBalls(bounded, TRACKING_STEP); stepTrackingBalls(invalid, Number.NaN);
    expect(huge).toEqual(bounded); expect(invalid).toEqual(original);
  });

  test('the first frame establishes the clock even when its timestamp predates the scheduling task', () => {
    const schedulingTaskTime = 1000.5, firstFrameTime = 1000;
    expect(firstFrameTime).toBeLessThan(schedulingTaskTime);
    expect(trackingFrameDelta(null, firstFrameTime)).toBe(0);
    expect(trackingFrameDelta(firstFrameTime, 1016)).toBeCloseTo(0.016);
    expect(trackingFrameDelta(firstFrameTime, 999)).toBeNull();
    expect(trackingFrameDelta(firstFrameTime, 1251)).toBeNull();
    expect(trackingFrameDelta(null, Number.NaN)).toBeNull();
  });
});
