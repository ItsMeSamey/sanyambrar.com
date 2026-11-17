export const TRACKING_WORLD = 600;
export const TRACKING_RADIUS = 40;
export const TRACKING_STEP = 1 / 120;
export type TrackingBall = { id: number; x: number; y: number; vx: number; vy: number; target: boolean; red: boolean };
export type TrackingRules = { total: number; targets: number; red: number; speed: number; duration: number };

export function trackingRules(completed: number, hard = false): TrackingRules {
  const level = Math.max(0, Math.floor(Number.isFinite(completed) ? completed : 0));
  const counts = [[6, 2], [7, 2], [7, 3], [8, 3], [9, 3], [9, 4], [10, 4], [11, 4], [11, 5], [12, 5], [12, 6]];
  const [total, targets] = counts[Math.min(level, counts.length - 1)];
  const extra = Math.max(0, level - 10);
  return { total, targets, red: hard ? 2 : 0,
    speed: Math.min(115, 70 + Math.floor(extra / 2) * 5),
    duration: Math.min(7, 4 + Math.ceil(extra / 2) * 0.25) };
}

export function trackingRandom(seed: number) {
  let state = seed >>> 0;
  return () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
}

export function createTrackingBalls(rules: TrackingRules, seed: number): TrackingBall[] {
  const random = trackingRandom(seed);
  const slots = Array.from({ length: 16 }, (_, id) => id);
  for (let i = slots.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [slots[i], slots[j]] = [slots[j], slots[i]];
  }
  const roles = Array.from({ length: rules.total }, (_, id) => id);
  for (let i = roles.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [roles[i], roles[j]] = [roles[j], roles[i]];
  }
  return roles.map((role, id) => {
    const slot = slots[id], angle = random() * Math.PI * 2;
    return { id, x: 90 + slot % 4 * 140 + (random() - 0.5) * 24,
      y: 90 + Math.floor(slot / 4) * 140 + (random() - 0.5) * 24,
      vx: Math.cos(angle) * rules.speed, vy: Math.sin(angle) * rules.speed,
      target: role < rules.targets, red: rules.red > 0 && (role === 0 || role === rules.targets) };
  });
}

/** Fixed world coordinates and fixed simulation steps keep the task identical at every screen size. */
export function stepTrackingBalls(balls: TrackingBall[], dt = TRACKING_STEP): void {
  const step = Math.max(0, Math.min(TRACKING_STEP, Number.isFinite(dt) ? dt : 0));
  const edge = TRACKING_WORLD - TRACKING_RADIUS, diameter = TRACKING_RADIUS * 2 + 4;
  const walls = (ball: TrackingBall) => {
    if (ball.x < TRACKING_RADIUS) { ball.x = TRACKING_RADIUS; ball.vx = Math.abs(ball.vx); }
    if (ball.x > edge) { ball.x = edge; ball.vx = -Math.abs(ball.vx); }
    if (ball.y < TRACKING_RADIUS) { ball.y = TRACKING_RADIUS; ball.vy = Math.abs(ball.vy); }
    if (ball.y > edge) { ball.y = edge; ball.vy = -Math.abs(ball.vy); }
  };
  for (const ball of balls) { ball.x += ball.vx * step; ball.y += ball.vy * step; walls(ball); }
  // Resolve simultaneous contacts repeatedly, including contacts against a wall.
  for (let pass = 0; pass < 10; pass++) {
    let contact = false;
    for (let i = 0; i < balls.length; i++) for (let j = i + 1; j < balls.length; j++) {
      const a = balls[i], b = balls[j], dx = b.x - a.x, dy = b.y - a.y;
      const distance = Math.hypot(dx, dy);
      if (distance >= diameter - 0.000001) continue;
      contact = true;
      const nx = distance > 0 ? dx / distance : 1, ny = distance > 0 ? dy / distance : 0;
      const overlap = (diameter - distance + 0.000001) / 2;
      a.x -= nx * overlap; a.y -= ny * overlap; b.x += nx * overlap; b.y += ny * overlap;
      const approach = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
      if (approach > 0) { a.vx -= approach * nx; a.vy -= approach * ny; b.vx += approach * nx; b.vy += approach * ny; }
      walls(a); walls(b);
    }
    if (!contact) break;
  }
}

export type TrackingScore = { completed: number; lives: number; correct: number; picks: number; selected: number[] };
export type TrackingPick = { score: TrackingScore; outcome: 'ignored' | 'correct' | 'complete' | 'wrong' | 'finished' };
export const initialTrackingScore = (): TrackingScore => ({ completed: 0, lives: 3, correct: 0, picks: 0, selected: [] });
export function pickTrackingBall(score: TrackingScore, balls: TrackingBall[], id: number): TrackingPick {
  const ball = balls.find(item => item.id === id);
  if (score.lives <= 0 || !ball || score.selected.includes(id)) return { score, outcome: 'ignored' };
  const correct = ball.target && !ball.red;
  const next = { ...score, picks: score.picks + 1, correct: score.correct + Number(correct), selected: [...score.selected, id] };
  if (!correct) { next.lives--; return { score: next, outcome: next.lives ? 'wrong' : 'finished' }; }
  const complete = balls.filter(item => item.target && !item.red).every(item => next.selected.includes(item.id));
  if (complete) next.completed++;
  return { score: next, outcome: complete ? 'complete' : 'correct' };
}

export function trackingFrameDelta(previous: number | null, now: number): number | null {
  // The first rAF timestamp can predate performance.now() from the scheduling task.
  // Establish the clock entirely from rAF timestamps, with no first-frame movement.
  if (previous === null) return Number.isFinite(now) ? 0 : null;
  const elapsed = (now - previous) / 1000;
  // A missed stretch of motion invalidates the round; it never fast-forwards to recall.
  return !Number.isFinite(elapsed) || elapsed < 0 || elapsed > 0.25 ? null : elapsed;
}
