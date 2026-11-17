import { expect, test } from 'bun:test';
import { Layout } from '../src/games/keybr/keyboard/layout.ts';
import { resultFromJson, resultToJson } from '../src/games/keybr/result/json.ts';
import { recoverResults } from '../src/games/keybr/result/recover.ts';
import { Result } from '../src/games/keybr/result/result.ts';
import { TextType } from '../src/games/keybr/result/texttype.ts';
import { Histogram } from '../src/games/keybr/textinput/histogram.ts';
import { makeStats } from '../src/games/keybr/textinput/stats.ts';

function compact() {
  return {
    l: Layout.EN_US.id, m: 'generated', ts: Date.UTC(2020, 0, 1), n: 20, t: 10000, e: 0,
    h: {97: {h: 8, m: 0, t: 100}, 98: {h: 6, m: 0, t: 100}, 99: {h: 6, m: 0, t: 100}},
  };
}
function exported() {
  return JSON.parse(JSON.stringify(resultFromJson(compact()))) as Record<string, unknown>;
}

test('compact and exported imports reject negative and nonfinite statistics', () => {
  for (const value of [-1, NaN, Infinity, -Infinity]) {
    for (const field of ['n', 't', 'e']) {
      expect(resultFromJson({...compact(), [field]: value})).toBeNull();
    }
    for (const field of ['length', 'time', 'errors']) {
      expect(resultFromJson({...exported(), [field]: value})).toBeNull();
    }
    for (const field of ['h', 'm', 't']) {
      const json = compact();
      Object.assign(json.h[97], {[field]: value});
      expect(resultFromJson(json)).toBeNull();
    }
    for (const field of ['hitCount', 'missCount', 'timeToType']) {
      const json = exported();
      Object.assign((json.histogram as Record<string, unknown>[])[0]!, {[field]: value});
      expect(resultFromJson(json)).toBeNull();
    }
  }
  for (const json of [compact(), exported()]) {
    if ('h' in json) Object.assign(json.h[97], {t: -0.1});
    else Object.assign((json.histogram as Record<string, unknown>[])[0]!, {timeToType: -0.1});
    expect(resultFromJson(json)).toBeNull();
  }
});

test('validation and recovery reject malformed results created outside JSON import', () => {
  const valid = resultFromJson(compact())!;
  for (const value of [-1, NaN, Infinity, -Infinity]) {
    for (const field of ['length', 'time', 'errors'] as const) {
      const stats = {length: valid.length, time: valid.time, errors: valid.errors, [field]: value};
      const result = new Result(valid.layout, valid.textType, valid.timeStamp, stats.length, stats.time, stats.errors, valid.histogram);
      expect(result.validate()).toBe(false);
      expect(recoverResults([result])).toEqual([]);
    }
    for (const field of ['hitCount', 'missCount', 'timeToType']) {
      const samples = [...valid.histogram].map(sample => ({...sample, [field]: value}));
      const result = new Result(valid.layout, valid.textType, valid.timeStamp, valid.length, valid.time, valid.errors, new Histogram(samples));
      expect(result.validate()).toBe(false);
      expect(recoverResults([result])).toEqual([]);
    }
  }
});

test('timestamps must be representable dates without excluding old history', () => {
  const valid = resultFromJson(compact())!;
  for (const timeStamp of [Number.MAX_SAFE_INTEGER, -Number.MAX_SAFE_INTEGER, NaN, Infinity, -Infinity]) {
    expect(resultFromJson({...compact(), ts: timeStamp})).toBeNull();
    expect(resultFromJson({...exported(), timeStamp})).toBeNull();
    const result = new Result(valid.layout, valid.textType, timeStamp, valid.length, valid.time, valid.errors, valid.histogram);
    expect(result.validate()).toBe(false);
  }
  for (const timeStamp of [-8640000000000000, -1, 0, 8640000000000000]) {
    const result = resultFromJson({...compact(), ts: timeStamp})!;
    expect(result.validate()).toBe(true);
    expect(resultFromJson(JSON.parse(JSON.stringify(result)))?.timeStamp).toBe(timeStamp);
  }
});

test('producer results with many errors and unmeasured timings survive both formats and recovery', () => {
  const steps = Array.from({length: 30}, (_, index) => ({
    codePoint: 97 + index % 3, timeStamp: index * 500, timeToType: 500, typo: index < 27,
  }));
  const result = Result.fromStats(Layout.EN_US, TextType.GENERATED, Date.UTC(2020, 0, 1), makeStats(steps));
  expect(result.errors).toBe(27);
  expect(result.validate()).toBe(true);
  const allErrors = Result.fromStats(Layout.EN_US, TextType.GENERATED, result.timeStamp, makeStats(steps.map(step => ({...step, typo: true}))));
  expect([...allErrors.histogram].every(sample => sample.timeToType === 0)).toBe(true);
  expect(allErrors.validate()).toBe(true);
  for (const original of [result, allErrors]) {
    const compactJson = resultToJson(original);
    const legacyJson = {...JSON.parse(JSON.stringify(original)), layout: 'us', textType: 'guided'};
    for (const json of [compactJson, legacyJson]) {
      const parsed = resultFromJson(json)!;
      expect(parsed.validate()).toBe(true);
      expect(parsed.errors).toBe(original.errors);
      expect(parsed.accuracy).toBe(original.accuracy);
      expect(recoverResults([parsed])).toEqual([parsed]);
    }
  }
});

test('recovery preserves history with one implausible timing and enough usable characters', () => {
  const valid = resultFromJson(compact())!;
  const result = new Result(valid.layout, valid.textType, valid.timeStamp, valid.length, valid.time, valid.errors,
    new Histogram([...valid.histogram, {codePoint: 100, hitCount: 1, missCount: 0, timeToType: 1}]));
  expect(result.validate()).toBe(false);
  const recovered = recoverResults([result]);
  expect(recovered).toHaveLength(1);
  expect([...recovered[0]!.histogram]).toEqual([...valid.histogram]);
});
