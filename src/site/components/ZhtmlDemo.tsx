import { For, Show, createSignal, createUniqueId, onCleanup, onSettled } from 'solid-js';
import { createProjectEngine, preloadProjectEngine } from '../demos/project-engine.ts';
import '../styles/engine-demos.css';
export const preloadZhtmlDemoAssets = preloadProjectEngine;
type Parsed = { nodes: Array<{ index: number; depth: number; tag: string; text: string; matched: boolean }>; matches: number; sourceBytes: number };
const examples = [
  { name: 'Links', selector: 'a.nav', html: '<main id="app">\n  <h1>Hello, web.</h1>\n  <nav>\n    <a class="nav" href="/work/">Work</a>\n    <a class="nav" href="/blog/">Writing</a>\n  </nav>\n  <p>Small tools, carefully made.</p>\n</main>' },
  { name: 'Nested list', selector: 'li > strong', html: '<section>\n  <h2>A small collection</h2>\n  <ul>\n    <li><strong>Zig</strong> systems</li>\n    <li><strong>Solid</strong> interfaces</li>\n  </ul>\n</section>' },
  { name: 'Imperfect HTML', selector: 'p', html: '<article>\n  <p>First paragraph\n  <p>Second paragraph<br>Another line\n  <img src="cover.png" alt="Cover">\n</article>' },
];
export function ZhtmlDemo() {
  const id = createUniqueId();
  const engine = createProjectEngine();
  const [source, setSource] = createSignal(examples[0]!.html);
  const [selector, setSelector] = createSignal(examples[0]!.selector);
  const [result, setResult] = createSignal<Parsed>();
  const [busy, setBusy] = createSignal(false);
  const [failure, setFailure] = createSignal('');
  const [selected, setSelected] = createSignal<number>();
  let disposed = false;
  let revision = 0;
  let operation = 0;
  const edit = () => { revision++; setResult(undefined); setFailure(''); };
  async function parse(html = source(), query = selector()) {
    const current = ++revision;
    const running = ++operation;
    setBusy(true); setFailure(''); setResult(undefined); setSelected(undefined);
    try {
      const { result: value } = await engine.run<Parsed>(0, { html, selector: query });
      if (!disposed && current === revision) setResult(value);
    } catch (error) { if (!disposed && current === revision) setFailure(error instanceof Error ? error.message : 'Parsing failed.'); }
    finally { if (!disposed && running === operation) setBusy(false); }
  }
  function example(index: number) {
    const value = examples[index]!;
    setSource(value.html); setSelector(value.selector); void parse(value.html, value.selector);
  }
  onSettled(() => { void parse(); });
  onCleanup(() => { disposed = true; engine.destroy(); });
  const selectedNode = () => result()?.nodes.find(node => node.index === selected());
  return <section class="engine-demo" aria-label="Try zhtml">
    <div class="engine-demo-examples" aria-label="HTML examples"><For each={examples}>{(item, index) => <button type="button" disabled={busy()} onClick={() => example(index())}>{item.name}</button>}</For></div>
    <form onSubmit={event => { event.preventDefault(); void parse(); }}>
      <label for={`${id}-html`}>HTML <span>up to 8 KiB</span></label>
      <textarea id={`${id}-html`} class="engine-demo-source" spellcheck={false} value={source()} maxlength={8192} onInput={event => { setSource(event.currentTarget.value); edit(); }} />
      <div class="engine-demo-query"><div><label for={`${id}-selector`}>CSS selector</label><input id={`${id}-selector`} spellcheck={false} value={selector()} maxlength={256} onInput={event => { setSelector(event.currentTarget.value); edit(); }}/></div><button type="submit" class="engine-demo-run" disabled={busy()}>{busy() ? 'Parsing…' : 'Parse & query'}</button></div>
    </form>
    <Show when={failure()}><p class="engine-demo-error" role="alert">{failure()} Check the HTML or selector and try again.</p></Show>
    <Show when={result()}>{value => <>
      <div class="engine-demo-stats" role="status"><span>{value().sourceBytes} source bytes</span><span>{value().nodes.length} nodes</span><strong>{value().matches} matches</strong></div>
      <div class="engine-demo-tree" aria-label="Parsed nodes"><For each={value().nodes}>{node => <button type="button" class={`${node.matched ? 'is-match' : ''} ${selected() === node.index ? 'is-selected' : ''}`} aria-pressed={selected() === node.index ? 'true' : 'false'} onClick={() => setSelected(node.index)} style={{ '--node-depth': String(Math.min(node.depth, 12)) }}><span class="engine-demo-node-id">{node.index}</span><code>{node.tag === '#text' ? `“${node.text.trim().slice(0, 90)}”` : `<${node.tag}>`}</code><Show when={node.matched}><span class="engine-demo-match">match</span></Show></button>}</For></div>
      <Show when={selectedNode()}>{node => <div class="engine-demo-inspect"><strong>Node {node().index} · depth {node().depth}</strong><pre>{node().tag === '#text' ? node().text : `<${node().tag}>${node().matched ? '\nMatches the selector.' : '\nDoes not match the selector.'}`}</pre></div>}</Show>
    </>}</Show>
  </section>;
}
