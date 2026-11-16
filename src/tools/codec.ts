const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function encodeBase32(bytes: Uint8Array): string {
  let out = '', buffer = 0, bits = 0;
  for (const byte of bytes) {
    buffer = buffer << 8 | byte;
    bits += 8;
    while (bits >= 5) { out += BASE32[buffer >>> (bits - 5) & 31]; bits -= 5; }
  }
  if (bits) out += BASE32[buffer << (5 - bits) & 31];
  return out.padEnd(Math.ceil(out.length / 8) * 8, '=');
}

export function decodeBase32(text: string): Uint8Array {
  const value = text.replace(/\s/g, '').toUpperCase();
  if (!value) return new Uint8Array();
  if (!/^[A-Z2-7]+={0,6}$/.test(value)) throw Error('Invalid Base32');
  const body = value.replace(/=+$/, '');
  if (![0, 2, 4, 5, 7].includes(body.length % 8)) throw Error('Invalid Base32');
  let buffer = 0, bits = 0;
  const out: number[] = [];
  for (const char of body) {
    buffer = buffer << 5 | BASE32.indexOf(char);
    bits += 5;
    if (bits >= 8) { out.push(buffer >>> (bits - 8) & 255); bits -= 8; }
  }
  const decoded = Uint8Array.from(out);
  const canonical = encodeBase32(decoded);
  // Accept omitted padding, but require the complete canonical suffix if present.
  if (canonical.replace(/=+$/, '') !== body || (value.includes('=') && canonical !== value)) throw Error('Invalid Base32');
  return decoded;
}

export function decodeBase64(text: string, url = false): Uint8Array {
  const value = text.replace(/\s/g, '');
  if (!value) return new Uint8Array();
  const invalid = () => Error(url ? 'Invalid Base64URL' : 'Invalid Base64');
  if (!(url ? /^[A-Za-z0-9_-]+={0,2}$/ : /^[A-Za-z0-9+/]+={0,2}$/).test(value)) throw invalid();
  const body = value.replace(/=+$/, '');
  if (body.length % 4 === 1) throw invalid();
  const padded = body.padEnd(Math.ceil(body.length / 4) * 4, '=');
  if ((!url || value.includes('=')) && value !== padded) throw invalid();
  const binary = atob(url ? padded.replace(/-/g, '+').replace(/_/g, '/') : padded);
  const canonical = btoa(binary);
  if (canonical !== (url ? padded.replace(/-/g, '+').replace(/_/g, '/') : padded)) throw invalid();
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}
