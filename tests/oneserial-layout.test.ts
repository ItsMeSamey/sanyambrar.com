import { describe, expect, test } from 'bun:test';
import { readFile } from 'node:fs/promises';
import { describeSerialFields, type PackedRecord, type SerialRecord } from '../src/site/demos/oneserial-layout.ts';

type Engine = WebAssembly.Exports & {
  memory: WebAssembly.Memory;
  input_ptr(): number;
  output_ptr(): number;
  output_len(): number;
  run(operation: number, length: number): void;
};
const { instance } = await WebAssembly.instantiate(await readFile(new URL('../src/site/demos/assets/project-engines.wasm', import.meta.url)));
const engine = instance.exports as Engine;
function pack(value: SerialRecord, truncate = false): PackedRecord {
  const bytes = new TextEncoder().encode(JSON.stringify({ value, truncate }));
  new Uint8Array(engine.memory.buffer, engine.input_ptr(), bytes.length).set(bytes);
  engine.run(1, bytes.length);
  return JSON.parse(new TextDecoder().decode(new Uint8Array(engine.memory.buffer, engine.output_ptr(), engine.output_len()))) as PackedRecord;
}

describe('OneSerial visualization describes actual WebAssembly output', () => {
  for (const name of ['', 'Ada', 'Nora', 'caf\u00e9', '\ud83d\udc99', 'x'.repeat(512)]) {
    for (const scores of [[], [0, 98, 65535], Array.from({ length: 128 }, (_, i) => i)]) {
      test(`maps every payload and padding byte: ${name.length} characters, ${scores.length} scores`, () => {
        const record = { id: 4294967295, user: { name, active: scores.length > 0 }, scores };
        const packed = pack(record);
        expect(packed.valid).toBe(true);
        const fields = describeSerialFields(packed);
        expect(fields).toHaveLength(4);
        const view = new DataView(new Uint8Array(packed.bytes).buffer);
        for (const field of fields) {
          expect(field.parts[0]?.start).toBe(field.start);
          expect(field.parts.at(-1)?.end).toBe(field.end);
          field.parts.forEach((part, index) => {
            if (index) expect(field.parts[index - 1]?.end).toBe(part.start);
            if (part.kind === 'padding') expect(packed.bytes.slice(part.start, part.end).every(byte => byte === 0)).toBe(true);
          });
        }
        const data = (index: number) => fields[index]!.parts.filter(part => part.kind === 'value');
        const length = (index: number) => fields[index]!.parts.find(part => part.kind === 'length')!;
        expect(view.getUint32(data(0)[0]!.start, true)).toBe(record.id);
        expect(view.getUint32(length(1).start, true)).toBe(new TextEncoder().encode(name).length);
        expect(data(1).flatMap(part => packed.bytes.slice(part.start, part.end))).toEqual([...new TextEncoder().encode(name)]);
        expect(packed.bytes[data(2)[0]!.start]).toBe(record.user.active ? 1 : 0);
        expect(view.getUint32(length(3).start, true)).toBe(scores.length);
        expect(data(3).map(part => view.getUint16(part.start, true))).toEqual(scores);
      });
    }
  }
  test('rejected buffers never receive trusted field annotations', () => {
    const packed = pack({ id: 42, user: { name: 'Ada', active: true }, scores: [98] }, true);
    expect(packed.valid).toBe(false);
    expect(describeSerialFields(packed)).toEqual([]);
  });
  test('annotations are withheld if engine field boundaries change', () => {
    const packed = pack({ id: 42, user: { name: 'Ada', active: true }, scores: [98] });
    packed.regions![0]!.end++;
    expect(describeSerialFields(packed)[0]?.parts).toEqual([]);
  });
});
