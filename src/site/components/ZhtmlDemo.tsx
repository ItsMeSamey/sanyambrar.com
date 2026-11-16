import { For, Show, createMemo, createSignal, createUniqueId, onCleanup, onSettled } from 'solid-js';
import { createProjectEngine, preloadProjectEngine } from '../demos/project-engine.ts';
import { describeZhtmlTree, zhtmlNodeText, type ZhtmlNode, type ZhtmlRow } from '../demos/zhtml-tree.ts';
import '../styles/engine-demos.css';
import '../styles/zhtml-demo.css';
export const preloadZhtmlDemoAssets = preloadProjectEngine;
type Parsed = { nodes: ZhtmlNode[]; matches: number; sourceBytes: number };
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
  const [preset, setPreset] = createSignal<number | undefined>(0);
  const rows = createMemo(() => describeZhtmlTree(result()?.nodes ?? []));
  const selectedNode = () => rows().find(node => node.index === selected());
  const matches = createMemo(() => rows().filter(node => node.matched));
  const sourceBytes = createMemo(() => new TextEncoder().encode(source()).length);
  const queryBytes = createMemo(() => new TextEncoder().encode(selector()).length);
  const inSubtree = (node: ZhtmlRow) => {
    const current = selectedNode();
    return !!current && node.index >= current.index && node.index <= current.end;
  };
  const isAncestor = (node: ZhtmlRow) => {
    const current = selectedNode();
    return !!current && node.index < current.index && node.end >= current.index;
  };
  const nodeLabel = (node: ZhtmlNode) => node.tag === '#text' ? `“${node.text.trim().slice(0, 70)}”` : `<${node.tag}>`;
  let disposed = false;
  let revision = 0;
  let operation = 0;
  const edit = () => { revision++; operation++; engine.destroy(); setBusy(false); setResult(undefined); setSelected(undefined); setPreset(undefined); setFailure(''); };
  async function parse(html = source(), query = selector()) {
    const current = ++revision;
    const running = ++operation;
    setBusy(true); setFailure(''); setResult(undefined); setSelected(undefined);
    try {
      if (new TextEncoder().encode(html).length > 8192) throw new Error('HTML exceeds the 8 KiB UTF-8 limit.');
      if (new TextEncoder().encode(query).length > 256) throw new Error('The selector exceeds the 256-byte UTF-8 limit.');
      const { result: value } = await engine.run<Parsed>(0, { html, selector: query });
      if (!disposed && current === revision) {
        setResult(value);
        setSelected(value.nodes.find(node => node.matched)?.index ?? value.nodes[0]?.index);
      }
    } catch (error) { if (!disposed && current === revision) setFailure(error instanceof Error ? error.message : 'Parsing failed.'); }
    finally { if (!disposed && running === operation) setBusy(false); }
  }
  function example(index: number) {
    const value = examples[index]!;
    setPreset(index); setSource(value.html); setSelector(value.selector); void parse(value.html, value.selector);
  }
  onSettled(() => { void parse(); });
  onCleanup(() => { disposed = true; engine.destroy(); });
  return <section class="engine-demo zhtml-demo" aria-label="Try zhtml">
    <div class="zhtml-toolbar">
      <div class="engine-demo-examples" aria-label="HTML examples"><For each={examples}>{(item, index) => <button type="button" aria-pressed={preset() === index() ? 'true' : 'false'} onClick={() => example(index())}>{item.name}</button>}</For></div>
      <span class="zhtml-runtime"><span aria-hidden="true"/>Zig / WebAssembly</span>
    </div>
    <form class="zhtml-workbench" onSubmit={event => { event.preventDefault(); void parse(); }}>
      <section class="zhtml-stage zhtml-source-stage" aria-labelledby={`${id}-source-heading`}>
        <header class="zhtml-stage-heading"><span aria-hidden="true">01</span><h3 id={`${id}-source-heading`}>Source</h3><span class="zhtml-flow" aria-hidden="true">→</span></header>
        <div class="zhtml-stage-detail">Borrowed UTF-8. Input stays intact.</div>
        <label for={`${id}-html`}>HTML <span class={sourceBytes() > 8192 ? 'zhtml-over-limit' : ''}>{sourceBytes()} / 8192 bytes</span></label>
        <textarea id={`${id}-html`} class="engine-demo-source" spellcheck={false} value={source()} maxlength={8192} onInput={event => { setSource(event.currentTarget.value); edit(); }} />
        <div class="zhtml-source-foot">Whitespace-only text nodes are dropped.</div>
      </section>
      <section class="zhtml-stage zhtml-tree-stage" aria-labelledby={`${id}-tree-heading`} aria-busy={busy() ? 'true' : 'false'}>
        <header class="zhtml-stage-heading"><span aria-hidden="true">02</span><h3 id={`${id}-tree-heading`}>Indexed tree</h3><span class="zhtml-flow" aria-hidden="true">→</span></header>
        <div class="zhtml-stage-detail">Parent links. Contiguous subtrees.</div>
        <Show when={result()} fallback={<p class="zhtml-empty">{busy() ? 'Running the Zig parser…' : failure() ? 'Parse failed. Edit the input and run again.' : 'Input changed. Parse to rebuild the tree.'}</p>}>
          <div class="zhtml-document"><span>0</span><code>#document</code><small>root</small></div>
          <div class="engine-demo-tree" aria-label="Parsed nodes"><For each={rows()}>{node => <button type="button" class={`${node.matched ? 'is-match' : ''} ${selected() === node.index ? 'is-selected' : ''} ${inSubtree(node) ? 'in-subtree' : ''} ${isAncestor(node) ? 'is-ancestor' : ''}`} aria-label={`Node ${node.index}, ${nodeLabel(node)}, depth ${node.depth}${node.matched ? ', selector match' : ''}`} aria-pressed={selected() === node.index ? 'true' : 'false'} onClick={() => setSelected(node.index)}>
            <span class="engine-demo-node-id">{node.index}</span><span class="zhtml-branches" aria-hidden="true"><For each={Array.from({ length: Math.min(node.depth + 1, 8) })}>{() => <i/>}</For></span><code>{nodeLabel(node)}</code><Show when={node.matched}><span class="engine-demo-match">match</span></Show>
          </button>}</For></div>
          <Show when={rows().length === 0}><p class="zhtml-empty">No element or text nodes.</p></Show>
        </Show>
      </section>
      <section class="zhtml-stage zhtml-query-stage" aria-labelledby={`${id}-query-heading`}>
        <header class="zhtml-stage-heading"><span aria-hidden="true">03</span><h3 id={`${id}-query-heading`}>Query</h3><span class="zhtml-query-count">{result()?.matches ?? '—'}</span></header>
        <div class="zhtml-stage-detail">CSS compiled at runtime in Zig.</div>
        <label for={`${id}-selector`}>CSS selector</label>
        <input id={`${id}-selector`} spellcheck={false} value={selector()} maxlength={256} aria-describedby={`${id}-selector-limit`} onInput={event => { setSelector(event.currentTarget.value); edit(); }}/>
        <span class="zhtml-query-limit" id={`${id}-selector-limit`}>{queryBytes()} / 256 bytes</span>
        <button type="submit" class="engine-demo-run" disabled={busy()}>{busy() ? 'Parsing…' : 'Parse & query'}</button>
        <div class="zhtml-matches" aria-label="Selector results"><For each={matches()}>{node => <button type="button" class={selected() === node.index ? 'is-selected' : ''} aria-pressed={selected() === node.index ? 'true' : 'false'} onClick={() => setSelected(node.index)}><span class="zhtml-result-heading"><span>#{node.index}</span><code>{`<${node.tag}>`}</code><span aria-hidden="true">↗</span></span><span class="zhtml-result-text">{zhtmlNodeText(rows(), node) || 'No text content'}</span></button>}</For><Show when={result() && matches().length === 0}><p class="zhtml-empty">No nodes match this selector.</p></Show></div>
      </section>
    </form>
    <Show when={failure()}><p class="engine-demo-error" role="alert">{failure()} Check the HTML or selector and try again.</p></Show>
    <Show when={busy()}><p class="zhtml-status" role="status">Running the WebAssembly parser and selector engine.</p></Show>
    <Show when={result()}>{value => <>
      <div class="engine-demo-stats" role="status"><span>{value().sourceBytes} source bytes</span><span>{value().nodes.length} {value().nodes.length === 1 ? 'node' : 'nodes'}</span><strong>{value().matches} {value().matches === 1 ? 'match' : 'matches'}</strong></div>
      <div class="zhtml-storage">
        <div class="zhtml-storage-heading"><h3>Node table</h3><span>Subtrees occupy consecutive slots. Select a node to trace its range.</span></div>
        <div class="zhtml-slots" aria-label="Contiguous node table"><For each={rows()}>{node => <button type="button" class={`${node.tag === '#text' ? 'is-text' : ''} ${node.matched ? 'is-match' : ''} ${inSubtree(node) ? 'in-subtree' : ''} ${selected() === node.index ? 'is-selected' : ''}`} aria-label={`Inspect node ${node.index}, ${node.tag}`} aria-pressed={selected() === node.index ? 'true' : 'false'} onClick={() => setSelected(node.index)}><span>{node.index}</span><code>{node.tag === '#text' ? 'text' : node.tag}</code><span class="zhtml-slot-mark" aria-hidden="true">{node.matched ? '●' : '·'}</span></button>}</For></div>
      </div>
      <Show when={selectedNode()}>{node => <div class="engine-demo-inspect zhtml-inspector">
        <div class="zhtml-inspect-meta"><strong>Node {node().index} <code>{node().tag === '#text' ? '#text' : `<${node().tag}>`}</code></strong><span>parent <b>#{node().parent}</b></span><span>depth <b>{node().depth}</b></span><span>subtree <b>{node().index === node().end ? `#${node().index}` : `#${node().index}–${node().end}`}</b></span></div>
        <div class="zhtml-inspect-text"><span>Source text</span><pre>{zhtmlNodeText(rows(), node()) || '(empty)'}</pre><span class={node().matched ? 'zhtml-matched-label' : ''}>{node().matched ? 'Matches the selector.' : 'Does not match the selector.'}</span></div>
      </div>}</Show>
    </>}</Show>
  </section>;
}
