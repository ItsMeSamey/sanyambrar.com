import { For, Show, createSignal, createUniqueId, onCleanup, onSettled } from 'solid-js';
import { createProjectEngine, preloadProjectEngine } from '../demos/project-engine.ts';
import '../styles/engine-demos.css';
export const preloadOneSerialDemoAssets = preloadProjectEngine;
type Packed = { bytes: number[]; valid: boolean; validation: string; decoded?: unknown; regions?: Array<{ name: string; start: number; end: number }> };
const sample = JSON.stringify({ id: 42, user: { name: 'Ada', active: true }, scores: [98, 87, 100] }, null, 2);
export function OneSerialDemo() {
  const id = createUniqueId();
  const engine = createProjectEngine();
  const [source, setSource] = createSignal(sample);
  const [truncate, setTruncate] = createSignal(false);
  const [result, setResult] = createSignal<Packed>();
  const [busy, setBusy] = createSignal(false);
  const [failure, setFailure] = createSignal('');
  const [region, setRegion] = createSignal<number>();
  let disposed = false;
  let revision = 0;
  let operation = 0;
  const edit = () => { revision++; setResult(undefined); setFailure(''); };
  async function pack(text = source(), damaged = truncate()) {
    const current = ++revision;
    const running = ++operation;
    setBusy(true); setFailure(''); setResult(undefined); setRegion(undefined);
    try {
      const value: unknown = JSON.parse(text);
      const { result: packed } = await engine.run<Packed>(1, { value, truncate: damaged });
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
  const selected = () => result()?.regions?.[region() ?? -1];
  return <section class="engine-demo" aria-label="Try OneSerial">
    <form onSubmit={event => { event.preventDefault(); void pack(); }}>
      <label for={`${id}-json`}>Record <span>JSON input</span></label>
      <textarea id={`${id}-json`} class="engine-demo-source" spellcheck={false} value={source()} maxlength={8192} onInput={event => { setSource(event.currentTarget.value); edit(); }}/>
      <p class="engine-demo-schema"><code>id: u32 · user: &#123; name: UTF-8, active: bool &#125; · scores: u16[]</code></p>
      <label class="engine-demo-toggle"><input type="checkbox" checked={truncate()} onChange={event => { setTruncate(event.currentTarget.checked); edit(); }}/>Remove the final byte before validation</label>
      <div class="engine-demo-actions"><button type="submit" class="engine-demo-run" disabled={busy()}>{busy() ? 'Packing…' : 'Pack & validate'}</button><button type="button" disabled={busy()} onClick={reset}>Reset example</button></div>
    </form>
    <Show when={failure()}><p class="engine-demo-error" role="alert">{failure()} Use the schema above: a name up to 512 UTF-8 bytes and up to 128 scores from 0 to 65535.</p></Show>
    <Show when={result()}>{value => <>
      <div class="engine-demo-stats" role="status"><span>{value().bytes.length} packed bytes</span><strong>{value().valid ? 'Validation passed' : 'Validation rejected'}</strong></div>
      <Show when={!value().valid}><p class="engine-demo-error">Truncated buffer: {value().validation}.</p></Show>
      <Show when={value().regions}><div class="engine-demo-regions" aria-label="Packed fields"><For each={value().regions}>{(field, index) => <button type="button" aria-pressed={region() === index() ? 'true' : 'false'} onClick={() => setRegion(region() === index() ? undefined : index())}><span>{field.name}</span><code>{field.start}–{field.end - 1}</code></button>}</For></div></Show>
      <div class="engine-demo-bytes" aria-label="Serialized bytes in hexadecimal"><For each={value().bytes}>{(byte, index) => <code class={selected() && index() >= selected()!.start && index() < selected()!.end ? 'is-highlighted' : ''} title={`Offset ${index()}: ${byte}`}>{byte.toString(16).padStart(2, '0')}</code>}</For></div>
      <Show when={value().valid}><div class="engine-demo-inspect"><strong>Decoded record</strong><pre>{JSON.stringify(value().decoded, null, 2)}</pre></div></Show>
      <button type="button" class="engine-demo-download" onClick={download}>Download this buffer</button>
    </>}</Show>
    <p class="engine-demo-note">wasm32, little-endian. Ranges include alignment padding; this layout is platform-specific.</p>
  </section>;
}
