// @ts-nocheck
import { DefaultLinesDiffComputer } from 'monaco-editor/editor/common/diff/defaultLinesDiffComputer/defaultLinesDiffComputer';

const computer = new DefaultLinesDiffComputer();
let originalText = '';
let modifiedText = '';
let revision = 0;
let scheduled = false;

const applyChanges = (text, changes) => {
  // Monaco range offsets are measured against the pre-change model. Applying
  // from the end preserves those offsets when one event contains many edits.
  const ordered = [...changes].sort((a, b) => b.rangeOffset - a.rangeOffset);
  for (const change of ordered) {
    text = text.slice(0, change.rangeOffset) + change.text + text.slice(change.rangeOffset + change.rangeLength);
  }
  return text;
};

const serializeRange = range => ({
  startLineNumber: range.startLineNumber,
  startColumn: range.startColumn,
  endLineNumber: range.endLineNumber,
  endColumn: range.endColumn,
});

const serializeMapping = mapping => ({
  originalStartLineNumber: mapping.original.startLineNumber,
  originalEndLineNumberExclusive: mapping.original.endLineNumberExclusive,
  modifiedStartLineNumber: mapping.modified.startLineNumber,
  modifiedEndLineNumberExclusive: mapping.modified.endLineNumberExclusive,
  innerChanges: mapping.innerChanges?.map(change => ({
    originalRange: serializeRange(change.originalRange),
    modifiedRange: serializeRange(change.modifiedRange),
  })) || [],
});

const compute = () => {
  scheduled = false;
  const started = performance.now();
  const computedRevision = revision;
  const result = computer.computeDiff(
    originalText.split('\n'),
    modifiedText.split('\n'),
    {
      // Live editing should never let a pathological comparison monopolize the
      // worker. The result remains valid on timeout, only less fine-grained.
      maxComputationTimeMs: 75,
      ignoreTrimWhitespace: true,
      computeMoves: false,
      extendToSubwords: false,
    },
  );
  postMessage({
    type: 'result',
    revision: computedRevision,
    computeMs: performance.now() - started,
    hitTimeout: result.hitTimeout,
    changes: result.changes.map(serializeMapping),
  });
  // Messages received after this computation began update `revision`; schedule
  // one more pass for the newest state. Intermediate stale results are ignored
  // by the UI, so rapid typing naturally coalesces instead of building a queue.
  if (computedRevision !== revision) schedule();
};

function schedule() {
  if (scheduled) return;
  scheduled = true;
  setTimeout(compute, 0);
}

self.onmessage = event => {
  const message = event.data;
  if (message.type === 'init') {
    originalText = message.original;
    modifiedText = message.modified;
    revision = message.revision;
    schedule();
    return;
  }
  if (message.type === 'edit') {
    if (message.side === 'original') originalText = applyChanges(originalText, message.changes);
    else modifiedText = applyChanges(modifiedText, message.changes);
    revision = message.revision;
    schedule();
  }
};
