// @ts-nocheck
import { DefaultLinesDiffComputer } from 'monaco-editor/editor/common/diff/defaultLinesDiffComputer/defaultLinesDiffComputer';

const computer = new DefaultLinesDiffComputer();
let originalLines = [''];
let modifiedLines = [''];
let revision = 0;
let scheduled = false;

const splitLines = text => text.split(/\r\n|\r|\n/);

const applyChanges = (lines, changes) => {
  // Monaco ranges in one event are measured against the same pre-change model.
  // Process independent line clusters bottom-to-top. Within a cluster, apply
  // edits to one small string snapshot so same-line/same-offset multi-cursor
  // changes keep Monaco's exact simultaneous-edit semantics without joining the
  // whole document.
  const indexed = changes.map((change, index) => ({ change, index }))
    .sort((a, b) => a.change.startLineNumber - b.change.startLineNumber ||
      a.change.endLineNumber - b.change.endLineNumber || a.index - b.index);
  const clusters = [];
  for (const item of indexed) {
    const last = clusters[clusters.length - 1];
    if (last && item.change.startLineNumber <= last.endLineNumber) {
      last.items.push(item);
      last.endLineNumber = Math.max(last.endLineNumber, item.change.endLineNumber);
    } else {
      clusters.push({
        startLineNumber: item.change.startLineNumber,
        endLineNumber: item.change.endLineNumber,
        items: [item],
      });
    }
  }

  for (let clusterIndex = clusters.length - 1; clusterIndex >= 0; clusterIndex--) {
    const cluster = clusters[clusterIndex];
    const startLine = cluster.startLineNumber - 1;
    const endLine = cluster.endLineNumber - 1;
    const segmentLines = lines.slice(startLine, endLine + 1);
    const lineOffsets = new Array(segmentLines.length);
    let offset = 0;
    for (let i = 0; i < segmentLines.length; i++) {
      lineOffsets[i] = offset;
      offset += segmentLines[i].length + 1;
    }
    const toOffset = (lineNumber, column) =>
      lineOffsets[lineNumber - cluster.startLineNumber] + column - 1;
    let segment = segmentLines.join('\n');
    const edits = cluster.items.map(({ change, index }) => ({
      start: toOffset(change.startLineNumber, change.startColumn),
      end: toOffset(change.endLineNumber, change.endColumn),
      text: change.text,
      index,
    })).sort((a, b) => b.start - a.start || a.index - b.index);
    for (const edit of edits) segment = segment.slice(0, edit.start) + edit.text + segment.slice(edit.end);
    lines.splice(startLine, endLine - startLine + 1, ...splitLines(segment));
  }
  return lines;
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
    originalLines,
    modifiedLines,
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
    originalLines = splitLines(message.original);
    modifiedLines = splitLines(message.modified);
    revision = message.revision;
    schedule();
    return;
  }
  if (message.type === 'edit') {
    if (message.side === 'original') applyChanges(originalLines, message.changes);
    else applyChanges(modifiedLines, message.changes);
    revision = message.revision;
    schedule();
  }
};
