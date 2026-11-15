import { describe, expect, test } from 'bun:test';
import { normalizeToolRadix, prepareDecodeInput, textStats } from '../src/tools/tools.ts';

describe('text tool word counts', () => {
  test('accented and decomposed words are counted once', () => {
    expect(textStats('Caf\u00e9 r\u00e9sum\u00e9 na\u00efve').words).toBe(3);
    expect(textStats('Cafe\u0301 re\u0301sume\u0301 nai\u0308ve').words).toBe(3);
    expect(textStats('hello_world 123 \u4f60\u597d\u4e16\u754c').words).toBe(3);
    expect(textStats('\ud83c\udf89 \u0301 !').words).toBe(0);
  });

  test('codepoint and UTF-8 counts remain distinct', () => {
    expect(textStats('A\ud83c\udf89\u00e9')).toEqual({ words: 2, chars: 3, bytes: 7, nonAscii: 2 });
  });
});

describe('number tool radix input', () => {
  test('fractional, out-of-range and nonfinite input always produces a usable radix', () => {
    for (const [input, expected] of [[2.5, 2], [61.9, 61], [-5, 2], [100, 62], [NaN, 36], [Infinity, 36], [-Infinity, 36]]) {
      const radix = normalizeToolRadix(input, 36);
      expect(radix).toBe(expected);
      expect(() => 255n / BigInt(radix)).not.toThrow();
    }
  });

  test('valid bases retain their value, including the case-sensitive range', () => {
    for (let radix = 2; radix <= 62; radix++) expect(normalizeToolRadix(radix, 10)).toBe(radix);
  });
});

describe('codec whitespace boundaries', () => {
  test('text encodings retain meaningful boundary whitespace and whitespace-only input', () => {
    for (const format of ['url', 'html', 'unicode', 'rot13']) {
      for (const text of ['  A  ', '\tA\n', ' \t\n', '']) expect(prepareDecodeInput(format, text)).toBe(text);
    }
    expect(decodeURIComponent(prepareDecodeInput('url', ' %41 '))).toBe(' A ');
  });

  test('byte encodings and JSON retain their permitted surrounding-whitespace normalization', () => {
    for (const format of ['base64', 'base64url', 'base32', 'base58', 'base88', 'hex', 'binary', 'json']) {
      expect(prepareDecodeInput(format, ' \tvalue\n')).toBe('value');
      expect(prepareDecodeInput(format, ' \t\n')).toBe('');
    }
    expect(JSON.parse(prepareDecodeInput('json', '  " A "  '))).toBe(' A ');
  });
});
