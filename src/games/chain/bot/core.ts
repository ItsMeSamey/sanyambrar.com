/** Exact CRT local-board adapter and one-step Gumbel deployment search. */
export interface BoardState {
  rows: number;
  cols: number;
  players: number;
  turn: number;
  counts: Uint8Array;
  owners: Uint8Array;
  entered: Uint8Array;
}

export interface Evaluation {
  policyLogits: Float32Array;
  valueLogits: Float32Array;
}
export type Evaluator = (states: BoardState[]) => Promise<Evaluation>;
export type TransitionStatus = "ok" | "terminal" | "cycle";

function degree(state: BoardState, index: number): number {
  const row = Math.floor(index / state.cols), col = index % state.cols;
  return 4 - Number(row === 0) - Number(row === state.rows - 1)
    - Number(col === 0) - Number(col === state.cols - 1);
}

export function validateState(state: BoardState): void {
  if (!Number.isInteger(state.rows) || state.rows < 2 || state.rows > 64
    || !Number.isInteger(state.cols) || state.cols < 2 || state.cols > 36
    || !Number.isInteger(state.players) || state.players < 2 || state.players > 9
    || !Number.isInteger(state.turn) || state.turn < 1 || state.turn > state.players) {
    throw new RangeError("Unsupported CRT board geometry, player count or turn");
  }
  const cells = state.rows * state.cols;
  if (!(state.counts instanceof Uint8Array) || state.counts.length !== cells
    || !(state.owners instanceof Uint8Array) || state.owners.length !== cells
    || !(state.entered instanceof Uint8Array) || state.entered.length !== state.players) {
    throw new TypeError("Board arrays must be Uint8Array with exact logical lengths");
  }
  for (let i = 0; i < cells; i++) {
    const count = state.counts[i], owner = state.owners[i];
    if (count >= degree(state, i) || owner > state.players
      || (count === 0) !== (owner === 0) || (owner > 0 && state.entered[owner - 1] !== 1)) {
      throw new RangeError("Search requires a stable consistent board");
    }
  }
  if (state.entered.some(value => value > 1)) throw new RangeError("Entered flags must be binary");
}

function snapshot(state: BoardState): BoardState {
  return { ...state, counts: state.counts.slice(), owners: state.owners.slice(), entered: state.entered.slice() };
}

export function encodeBatch(states: BoardState[]): {
  features: Float32Array; playerMeta: Float32Array; playerMask: Uint8Array;
  batch: number; rows: number; cols: number;
} {
  if (!states.length) throw new RangeError("Encoder batch must be non-empty");
  states.forEach(validateState);
  const { rows, cols, players } = states[0], cells = rows * cols;
  if (states.some(state => state.rows !== rows || state.cols !== cols || state.players !== players)) {
    throw new RangeError("Encoder batch must share geometry and player count");
  }
  const features = new Float32Array(states.length * 16 * cells);
  const playerMeta = new Float32Array(states.length * 27);
  const playerMask = new Uint8Array(states.length * 9);
  states.forEach((state, batch) => {
    const material = new Float32Array(players), offset = batch * 16 * cells;
    for (let i = 0; i < cells; i++) {
      const count = state.counts[i], owner = state.owners[i], threshold = degree(state, i) - 1;
      const relative = owner ? (owner - state.turn + players) % players : -1;
      features[offset + i] = 1;
      features[offset + cells + i] = Number(owner === 0);
      if (relative >= 0) {
        features[offset + (2 + relative) * cells + i] = 1;
        material[relative] += count;
      }
      features[offset + 11 * cells + i] = count / 4;
      features[offset + 12 * cells + i] = count / threshold;
      features[offset + 13 * cells + i] = Number(count > 0 && count === threshold);
      features[offset + 14 * cells + i] = threshold / 3;
      features[offset + 15 * cells + i] = Number(owner === 0 || owner === state.turn);
    }
    for (let relative = 0; relative < players; relative++) {
      playerMask[batch * 9 + relative] = 1;
      const meta = batch * 27 + relative * 3;
      playerMeta[meta] = 1;
      playerMeta[meta + 1] = state.entered[(state.turn - 1 + relative) % players];
      playerMeta[meta + 2] = material[relative] / (cells * 3);
    }
  });
  return { features, playerMeta, playerMask, batch: states.length, rows, cols };
}

function winner(state: BoardState, pendingOwner = 0): number {
  if (state.entered.some(value => value === 0)) return 0;
  const live = new Set<number>();
  for (let i = 0; i < state.counts.length; i++) if (state.counts[i]) live.add(state.owners[i]);
  if (pendingOwner) live.add(pendingOwner);
  return live.size === 1 ? live.values().next().value ?? 0 : 0;
}

export function transition(input: BoardState, index: number): {
  state: BoardState; status: TransitionStatus; winner: number;
} {
  validateState(input);
  if (!Number.isInteger(index) || index < 0 || index >= input.counts.length
    || (input.owners[index] !== 0 && input.owners[index] !== input.turn)) {
    throw new RangeError("Illegal move");
  }
  const state = snapshot(input), mover = state.turn, cells = state.counts.length;
  state.entered[mover - 1] = 1;
  let pending = new Uint32Array(cells);
  pending[index] = 1;
  let winnerDuring = 0;
  const limit = Math.min(16384, Math.max(64, 16 * cells));
  for (let wave = 0; wave < limit; wave++) {
    const next = new Uint32Array(cells);
    let hasNext = false;
    for (let i = 0; i < cells; i++) {
      if (!pending[i]) continue;
      const total = state.counts[i] + pending[i], capacity = degree(state, i);
      const bursts = Math.floor(total / capacity), remainder = total % capacity;
      state.counts[i] = remainder;
      state.owners[i] = remainder ? mover : 0;
      if (!bursts) continue;
      const row = Math.floor(i / state.cols), col = i % state.cols;
      if (row > 0) next[i - state.cols] += bursts;
      if (row + 1 < state.rows) next[i + state.cols] += bursts;
      if (col > 0) next[i - 1] += bursts;
      if (col + 1 < state.cols) next[i + 1] += bursts;
      hasNext = true;
    }
    if (!hasNext) {
      const win = winner(state);
      if (win) { state.turn = win; return { state, status: "terminal", winner: win }; }
      for (let step = 1; step <= state.players; step++) {
        const candidate = (mover - 1 + step) % state.players + 1;
        if (!state.entered[candidate - 1] || state.owners.includes(candidate)) {
          state.turn = candidate;
          break;
        }
      }
      return { state, status: "ok", winner: 0 };
    }
    winnerDuring = winner(state, mover);
    pending = next;
  }
  if (winnerDuring) {
    state.turn = winnerDuring;
    return { state, status: "terminal", winner: winnerDuring };
  }
  return { state, status: "cycle", winner: 0 };
}

function checkEvaluation(result: Evaluation, batch: number, cells: number): void {
  if (!(result.policyLogits instanceof Float32Array) || result.policyLogits.length !== batch * cells
    || !(result.valueLogits instanceof Float32Array) || result.valueLogits.length !== batch * 9
    || result.policyLogits.some(value => !Number.isFinite(value))
    || result.valueLogits.some(value => !Number.isFinite(value))) {
    throw new TypeError("Evaluator must return finite flattened float32 policy and nine-slot value logits");
  }
}

function softmax(logits: Float32Array, indices: number[], offset = 0): Float32Array {
  const max = Math.max(...indices.map(index => logits[offset + index]));
  const weights = indices.map(index => Math.fround(Math.exp(Math.fround(logits[offset + index] - max))));
  const sum = weights.reduce((total, value) => Math.fround(total + value), 0);
  return Float32Array.from(weights, weight => weight / sum);
}

export async function chooseMove(
  input: BoardState, evaluate: Evaluator, random: () => number = Math.random,
): Promise<{ index: number; candidates: number }> {
  validateState(input);
  // Pin all decision inputs before asynchronous inference; game arrays remain main-thread owned.
  const state = snapshot(input), cells = state.counts.length;
  const legal = Array.from({ length: cells }, (_, index) => index)
    .filter(index => state.owners[index] === 0 || state.owners[index] === state.turn);
  if (!legal.length) throw new RangeError("Search root has no legal action");
  const root = await evaluate([snapshot(state)]);
  checkEvaluation(root, 1, cells);
  const prior = softmax(root.policyLogits, legal);
  const candidates = legal.flatMap((index, slot) => {
    if (prior[slot] <= 0) return [];
    const draw = random();
    if (!Number.isFinite(draw) || draw < 0 || draw > 1) throw new RangeError("Random draws must be in [0,1]");
    const gumbel = -Math.log(-Math.log(Math.min(1 - 1e-9, Math.max(1e-9, draw))));
    return [{ index, prior: prior[slot], gumbel: Math.fround(gumbel),
      score: Math.fround(Math.log(Math.max(prior[slot], 1e-20))) + gumbel, q: 0 }];
  }).sort((a, b) => b.score - a.score).slice(0, 4);
  const children = candidates.map(candidate => transition(state, candidate.index));
  const evalIndices: number[] = [];
  children.forEach((child, i) => {
    if (child.status === "terminal") candidates[i].q = Number(child.winner === state.turn);
    else if (child.status === "cycle") candidates[i].q = Math.fround(1 / state.players);
    else evalIndices.push(i);
  });
  if (evalIndices.length) {
    const values = await evaluate(evalIndices.map(index => snapshot(children[index].state)));
    checkEvaluation(values, evalIndices.length, cells);
    evalIndices.forEach((index, batch) => {
      const probabilities = softmax(values.valueLogits, Array.from({ length: state.players }, (_, i) => i), batch * 9);
      const relative = (state.turn - children[index].state.turn + state.players) % state.players;
      candidates[index].q = probabilities[relative];
    });
  }
  const minimum = Math.min(...candidates.map(candidate => candidate.q));
  const span = Math.fround(Math.max(...candidates.map(candidate => candidate.q)) - minimum);
  const scale = state.players >= 8 ? 8 : 12;
  let selected = candidates[0], best = -Infinity;
  for (const candidate of candidates) {
    const q = span >= 1e-6 ? Math.fround(Math.fround(candidate.q - minimum) / span) : 0;
    const score = Math.fround(Math.fround(Math.fround(Math.log(Math.max(candidate.prior, 1e-20))) + candidate.gumbel)
      + Math.fround(scale * q));
    if (score > best) { best = score; selected = candidate; }
  }
  return { index: selected.index, candidates: candidates.length };
}
