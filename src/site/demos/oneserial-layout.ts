export type SerialRecord = { id: number; user: { name: string; active: boolean }; scores: number[] };
export type PackedRecord = {
  bytes: number[];
  valid: boolean;
  validation: string;
  decoded?: SerialRecord;
  regions?: Array<{ name: string; start: number; end: number }>;
};
export type BytePart = { start: number; end: number; kind: 'padding' | 'length' | 'value'; label: string };
export type SerialField = {
  name: string;
  type: string;
  value: string;
  start: number;
  end: number;
  parts: BytePart[];
  explanation: string;
};

// Annotate the pinned wasm32 format. The engine remains the source of bytes,
// field boundaries and decoded values; this helper never packs or validates.
export function describeSerialFields(packed: PackedRecord): SerialField[] {
  if (!packed.valid || !packed.decoded || packed.regions?.length !== 4) return [];
  const record = packed.decoded;
  const values = [String(record.id), JSON.stringify(record.user.name), String(record.user.active), JSON.stringify(record.scores)];
  const names = ['id', 'user.name', 'user.active', 'scores'];
  const types = ['u32', 'UTF-8', 'bool', 'u16[]'];
  const explanations = [
    'A 32-bit integer, least-significant byte first.',
    'A 32-bit byte count, followed by the UTF-8 string.',
    'One byte: 01 is true; 00 is false.',
    'A 32-bit element count, followed by 16-bit integers.',
  ];
  return packed.regions.map((region, index) => {
    const parts: BytePart[] = [];
    let cursor = region.start;
    function scalar(size: number, label: string, kind: BytePart['kind'] = 'value') {
      // This pinned library advances even an already-aligned scalar (except u8).
      const start = size === 1 ? cursor : cursor + ((size - 1) & ~cursor) + 1;
      if (start > cursor) parts.push({ start: cursor, end: start, kind: 'padding', label: 'Alignment padding' });
      parts.push({ start, end: start + size, kind, label });
      cursor = start + size;
    }
    if (index === 0) scalar(4, `id = ${record.id}`);
    if (index === 1) {
      const length = new TextEncoder().encode(record.user.name).length;
      scalar(4, `String length = ${length} UTF-8 bytes`, 'length');
      if (length) parts.push({ start: cursor, end: cursor + length, kind: 'value', label: 'UTF-8 string data' });
      cursor += length;
    }
    if (index === 2) scalar(1, `user.active = ${String(record.user.active)}`);
    if (index === 3) {
      scalar(4, `Array length = ${record.scores.length} elements`, 'length');
      record.scores.forEach((score, scoreIndex) => scalar(2, `scores[${scoreIndex}] = ${score}`));
    }
    // Do not display guessed annotations if the shipped format ever changes.
    const matched = cursor === region.end;
    return {
      name: names[index]!, type: types[index]!, value: values[index]!,
      start: region.start, end: region.end, parts: matched ? parts : [],
      explanation: matched ? explanations[index]! : 'Field range reported by the engine.',
    };
  });
}
