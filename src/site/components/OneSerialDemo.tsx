import { For, Show, createMemo, createSignal, createUniqueId, onCleanup, onSettled } from 'solid-js';
import { createProjectEngine, preloadProjectEngine } from '../demos/project-engine.ts';
import { describeSerialFields, type PackedRecord } from '../demos/oneserial-layout.ts';
import '../styles/engine-demos.css';
import '../styles/oneserial-demo.css';
export const preloadOneSerialDemoAssets = preloadProjectEngine;
const sample = JSON.stringify({ id: 42, user: { name: 'Ada', active: true }, scores: [98, 87, 100] }, null, 2);
export function OneSerialDemo() {
  const id = createUniqueId();
  const engine = createProjectEngine();
  const [source, setSource] = createSignal(sample);
  const [truncate, setTruncate] = createSignal(false);
  const [result, setResult] = createSignal<PackedRecord>();
  const [busy, setBusy] = createSignal(false);
  const [failure, setFailure] = createSignal('');
  const [region, setRegion] = createSignal(0);
  const [hovered, setHovered] = createSignal<number>();
  const [focused, setFocused] = createSignal<number>();
  let disposed = false;
  let revision = 0;
  let operation = 0;
  const edit = () => { revision++; setResult(undefined); setFailure(''); };
  async function pack(text = source(), damaged = truncate()) {
    const current = ++revision;
    const running = ++operation;
    setBusy(true); setFailure(''); setResult(undefined); setRegion(0); setHovered(undefined); setFocused(undefined);
    try {
      const value: unknown = JSON.parse(text);
      const { result: packed } = await engine.run<PackedRecord>(1, { value, truncate: damaged });
      if (!disposed && current === revision) setResult(packed);
    } catch (error) { if (!disposed && current === revision) setFailure(error instanceof Error ? error.message : 'Packing failed.'); }
    finally { if (!disposed && running === operation) setBusy(false); }
  }
  function reset() { edit(); setSource(sample); setTruncate(false); void pack(sample, false); }
  function download() {
    const value = result();
    if (!value) return;
    const url = URL.createObjectURL(new Blob([new Uint8Array(value.bytes)], { type: 'application/octet-stream' }));
    const link = document.createElement('a'); link.href = url; link.download = value.valid ? 'oneserial-record.bin' : 'oneserial-truncated.bin'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  onSettled(() => { void pack(); });
  onCleanup(() => { disposed = true; engine.destroy(); });
  const fields = createMemo(() => result() ? describeSerialFields(result()!) : []);
  const activeRegion = () => hovered() ?? focused() ?? region();
  const selected = () => fields()[activeRegion()];
  const hex = (byte: number) => byte.toString(16).padStart(2, '0');
  return <section class="engine-demo serial-demo" aria-label="Try OneSerial">
    <form onSubmit={event => { event.preventDefault(); void pack(); }}>
      <label for={`${id}-json`}>Record <span>01 / edit the input</span></label>
      <textarea id={`${id}-json`} class="engine-demo-source" spellcheck={false} value={source()} maxlength={8192} onInput={event => { setSource(event.currentTarget.value); edit(); }}/>
      <p class="engine-demo-schema"><code>id: u32 · user: &#123; name: UTF-8, active: bool &#125; · scores: u16[]</code></p>
      <label class="engine-demo-toggle"><input type="checkbox" checked={truncate()} onChange={event => { setTruncate(event.currentTarget.checked); edit(); }}/>Remove the final byte before validation</label>
      <div class="engine-demo-actions"><button type="submit" class="engine-demo-run" disabled={busy()}>{busy() ? 'Packing…' : 'Pack & validate'}</button><button type="button" disabled={busy()} onClick={reset}>Reset example</button></div>
    </form>
    <Show when={failure()}><p class="engine-demo-error" role="alert">{failure()} Use the schema above: a name up to 512 UTF-8 bytes and up to 128 scores from 0 to 65535.</p></Show>
    <Show when={result()}>{value => <>
      <div class="engine-demo-stats" role="status"><span>02 / packed into {value().bytes.length} bytes</span><strong>{value().valid ? 'Validation passed' : 'Validation rejected'}</strong></div>
      <Show when={!value().valid}><p class="engine-demo-error">Truncated buffer: {value().validation}.</p></Show>
      <Show when={fields().length} fallback={<div class="engine-demo-bytes serial-damaged" aria-label="Serialized bytes in hexadecimal"><For each={value().bytes}>{(byte, index) => <code title={`Offset ${index()}: ${byte}`}>{hex(byte)}</code>}</For></div>}>
        <p class="serial-hint">Follow a field into the buffer. Hover, focus or select a row.</p>
        <div class="serial-map engine-demo-regions" aria-label="Packed fields">
          <For each={fields()}>{(field, index) => <div class={`serial-map-row${activeRegion() === index() ? ' is-active' : ''}`} onPointerEnter={event => { if (event.pointerType !== 'touch') setHovered(index()); }} onPointerLeave={() => setHovered(undefined)}>
            <button type="button" class="serial-field" aria-pressed={region() === index() ? 'true' : 'false'} aria-describedby={`${id}-field-detail`} onFocus={() => setFocused(index())} onBlur={() => setFocused(undefined)} onClick={() => setRegion(index())}>
              <span class="serial-field-name">{field.name}<small>{field.type}</small></span>
              <code class="serial-field-value">{field.value}</code>
              <span class="serial-range">bytes {field.start}–{field.end - 1}</span>
            </button>
            <svg class="serial-connector" viewBox="0 0 48 24" aria-hidden="true"><path d="M0 12 H48 M40 7 L46 12 L40 17"/></svg>
            <div class="serial-memory">
              <div class="engine-demo-bytes" aria-label={`${field.name}, bytes ${field.start} to ${field.end - 1}`}>
                <For each={value().bytes.slice(field.start, field.end)}>{(byte, offset) => {
                  const position = () => field.start + offset();
                  const part = () => field.parts.find(item => position() >= item.start && position() < item.end);
                  return <code class={`${activeRegion() === index() ? 'is-highlighted' : ''} ${part()?.kind === 'padding' ? 'is-padding' : ''} ${part()?.kind === 'length' ? 'is-length' : ''}`} title={`Byte ${position()} · ${part()?.label ?? field.name} · 0x${hex(byte)} (${byte})`}><span class="serial-byte-offset" aria-hidden="true">{position()}</span>{hex(byte)}</code>;
                }}</For>
              </div>
            </div>
          </div>}</For>
        </div>
        <div class="serial-detail" id={`${id}-field-detail`}>
          <Show when={selected()}>{field => <><p><strong>{field().name}</strong> {field().explanation}</p><div class="serial-parts"><For each={(['value', 'length', 'padding'] as const).filter(kind => field().parts.some(part => part.kind === kind))}>{kind => <span class={`serial-part serial-part-${kind}`}><i aria-hidden="true"/>{kind === 'value' ? 'data' : kind} <b>{field().parts.filter(part => part.kind === kind).reduce((count, part) => count + part.end - part.start, 0)} B</b></span>}</For></div></>}</Show>
        </div>
      </Show>
      <Show when={value().valid}><div class="engine-demo-inspect"><strong>03 / read the validated buffer</strong><p class="serial-hint">The engine validates the bytes, then reads back this record.</p><pre>{JSON.stringify(value().decoded, null, 2)}</pre></div></Show>
      <button type="button" class="engine-demo-download" onClick={download}>Download this buffer</button>
    </>}</Show>
    <p class="engine-demo-note">Real OneSerial running in WebAssembly. wasm32, little-endian; the pinned library includes alignment padding. This layout is platform-specific.</p>
  </section>;
}
