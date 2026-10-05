import { describe, expect, test } from "bun:test";
import { chooseMove, encodeBatch, transition, validateState, type BoardState } from "../src/games/chain/bot/core";
import fixtures from "./fixtures/chain-bot-core.json";

function state(input: { rows: number; cols: number; players: number; turn: number;
  counts: number[]; owners: number[]; entered: number[] }): BoardState {
  return { ...input, counts: Uint8Array.from(input.counts), owners: Uint8Array.from(input.owners),
    entered: Uint8Array.from(input.entered) };
}

describe("accepted CRT browser adapter", () => {
  for (const [i, fixture] of fixtures.encoders.entries()) {
    test(`NCHW and relative metadata match Python encoder ${i}`, () => {
      const board = fixture.board;
      const states = board.turns.map((turn, batch) => state({ ...board, turn,
        counts: board.counts[batch], owners: board.owners[batch], entered: board.entered[batch] }));
      const encoded = encodeBatch(states);
      expect(Array.from(encoded.features)).toEqual(fixture.inputs.features.data);
      expect(Array.from(encoded.playerMeta)).toEqual(fixture.inputs.player_meta.data);
      expect(Array.from(encoded.playerMask)).toEqual(fixture.inputs.player_mask.data.map(Number));
    });
  }
  for (const [i, fixture] of fixtures.transitions.entries()) {
    test(`synchronous cascade matches Python transition ${i}`, () => {
      const input = state(fixture.state), before = state(fixture.state);
      const result = transition(input, fixture.index);
      expect(Array.from(result.state.counts)).toEqual(fixture.counts);
      expect(Array.from(result.state.owners)).toEqual(fixture.owners);
      expect(Array.from(result.state.entered)).toEqual(fixture.entered);
      expect(result.state.turn).toBe(fixture.turn);
      expect(result.status).toBe(fixture.status);
      expect(result.winner).toBe(fixture.winner);
      expect(input).toEqual(before);
    });
  }
  for (const [i, fixture] of fixtures.searches.entries()) {
    test(`fixed Gumbel action matches accepted Python search ${i}`, async () => {
      let evaluations = 0, draw = 0;
      const input = state(fixture.state), before = state(fixture.state);
      const result = await chooseMove(input, async states => {
        evaluations++;
        if (evaluations === 1) {
          expect(states.length).toBe(1);
          return { policyLogits: Float32Array.from(fixture.policy), valueLogits: new Float32Array(9) };
        }
        expect(states.length).toBe(fixture.values.length);
        return { policyLogits: new Float32Array(states.length * input.rows * input.cols),
          valueLogits: Float32Array.from(fixture.values.flat()) };
      }, () => fixture.draws[draw++]);
      expect(result).toEqual({ index: fixture.index, candidates: fixture.candidates });
      expect(draw).toBe(fixture.draws.length);
      expect(input).toEqual(before);
      expect(evaluations).toBe(fixture.values.length ? 2 : 1);
    });
  }
  test("bounded sinkless cycle is uniform and unentered players prevent terminal", async () => {
    const input = state({ rows: 2, cols: 2, players: 3, turn: 1,
      counts: [1, 1, 1, 1], owners: [1, 2, 1, 2], entered: [1, 1, 0] });
    expect(transition(input, 0).status).toBe("cycle");
    const result = await chooseMove(input, async () => ({
      policyLogits: new Float32Array(4), valueLogits: new Float32Array(9),
    }), () => 0.5);
    expect(result.candidates).toBe(2);
  });
  test("eliminated players are skipped but unentered players retain their turn", () => {
    const input = state({ rows: 3, cols: 3, players: 4, turn: 1,
      counts: [1, 0, 0, 0, 0, 0, 0, 0, 1], owners: [1, 0, 0, 0, 0, 0, 0, 0, 4],
      entered: [1, 1, 0, 1] });
    expect(transition(input, 4).state.turn).toBe(3);
  });
  test("rejects malformed, unstable and mixed batch states", () => {
    const input = state({ rows: 2, cols: 2, players: 2, turn: 1,
      counts: [0, 0, 0, 0], owners: [0, 0, 0, 0], entered: [0, 0] });
    expect(() => validateState({ ...input, rows: 65 })).toThrow();
    expect(() => validateState({ ...input, players: 10 })).toThrow();
    expect(() => validateState({ ...input, entered: new Uint8Array(3) })).toThrow();
    expect(() => validateState({ ...input, counts: Uint8Array.from([2, 0, 0, 0]) })).toThrow();
    expect(() => validateState({ ...input, owners: Uint8Array.from([1, 0, 0, 0]) })).toThrow();
    expect(() => encodeBatch([])).toThrow();
    expect(() => transition(input, -1)).toThrow();
    expect(() => encodeBatch([input, { ...input, players: 3, entered: new Uint8Array(3) }])).toThrow();
  });
  test("validates evaluator shape and random draws", async () => {
    const input = state({ rows: 2, cols: 2, players: 2, turn: 1,
      counts: [0, 0, 0, 0], owners: [0, 0, 0, 0], entered: [0, 0] });
    await expect(chooseMove(input, async () => ({
      policyLogits: new Float32Array(3), valueLogits: new Float32Array(9),
    }))).rejects.toThrow();
    await expect(chooseMove(input, async () => ({
      policyLogits: new Float32Array(4), valueLogits: new Float32Array(9),
    }), () => NaN)).rejects.toThrow();
  });
});
