import { describe, expect, test } from 'bun:test';
import { decodeBase32, decodeBase64, encodeBase32 } from '../src/tools/codec.ts';

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const vectors = [
  ['', '', ''], ['f', 'MY======', 'Zg=='], ['fo', 'MZXQ====', 'Zm8='],
  ['foo', 'MZXW6===', 'Zm9v'], ['foob', 'MZXW6YQ=', 'Zm9vYg=='],
  ['fooba', 'MZXW6YTB', 'Zm9vYmE='], ['foobar', 'MZXW6YTBOI======', 'Zm9vYmFy'],
];

describe('canonical byte encodings', () => {
  test('RFC 4648 vectors accept complete padding and supported unpadded forms', () => {
    for (const [text, base32, base64] of vectors) {
      expect(encodeBase32(encoder.encode(text))).toBe(base32);
      expect(decoder.decode(decodeBase32(base32))).toBe(text);
      expect(decoder.decode(decodeBase32(base32.replace(/=+$/, '').toLowerCase()))).toBe(text);
      expect(decoder.decode(decodeBase64(base64))).toBe(text);
      expect(decoder.decode(decodeBase64(base64, true))).toBe(text);
      expect(decoder.decode(decodeBase64(base64.replace(/=+$/, ''), true))).toBe(text);
    }
  });

  test('Base32 rejects partial, excess, misplaced padding and nonzero pad bits', () => {
    for (const value of ['MY=', 'MY=====', 'MY=======', 'MZXQ=', 'MZXW6=', 'MZXW6YTB=', 'MY======A', '=MY', 'M', 'MZX', 'MZXW6Y', 'MZ======', 'MZ', 'MZX-R===']) {
      expect(() => decodeBase32(value)).toThrow('Invalid Base32');
    }
  });

  test('Base64URL rejects partial, excess, misplaced padding and nonzero pad bits', () => {
    for (const value of ['Zg=', 'Zm8==', 'Zm9v=', 'Zg===', 'Z=g', '=Zg', 'Z', 'Zh', 'Zh==', 'Zm9', 'Zm9=', '+w==', '/w==']) {
      expect(() => decodeBase64(value, true)).toThrow('Invalid Base64URL');
    }
  });

  test('Base64 requires canonical padding and pad bits', () => {
    for (const value of ['Zg', 'Zg=', 'Zm8', 'Zm8==', 'Zm9v=', 'Zh==', 'Zm9=', '-w==', '_w==']) {
      expect(() => decodeBase64(value)).toThrow('Invalid Base64');
    }
  });

  test('whitespace is accepted without changing the binary payload or alphabet', () => {
    expect(decoder.decode(decodeBase32(' \tm y = = = = = =\n'))).toBe('f');
    expect(decoder.decode(decodeBase64(' Z g = =\n'))).toBe('f');
    expect(decodeBase64('-_8', true)).toEqual(new Uint8Array([251, 255]));
    expect(decodeBase64('-_8=', true)).toEqual(new Uint8Array([251, 255]));
    expect(decodeBase64('+/8=')).toEqual(new Uint8Array([251, 255]));
  });
});
