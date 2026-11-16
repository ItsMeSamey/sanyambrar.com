// These DOM scenarios run in the connected browser or the compiled development fixture.
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const check = (condition, message) => { if (!condition) throw new Error(message); };
const wait = async (read, message) => {
  for (let attempt = 0; attempt < 400; attempt++) { if (read()) return; await pause(5); }
  throw new Error(message);
};

function clipboardFixture() {
  const clipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
  const exec = Object.getOwnPropertyDescriptor(document, 'execCommand');
  const pending = [];
  Object.defineProperty(document, 'execCommand', { configurable: true, value: () => false });
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
    writeText: text => new Promise((resolve, reject) => pending.push({ text, resolve, reject })),
  } });
  return {
    pending,
    unavailable() { Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined }); },
    restore() {
      if (clipboard) Object.defineProperty(navigator, 'clipboard', clipboard); else delete navigator.clipboard;
      if (exec) Object.defineProperty(document, 'execCommand', exec); else delete document.execCommand;
    },
  };
}

export async function exerciseWordleCopyFeedback() {
  const clipboard = clipboardFixture();
  const button = () => document.querySelector('.wordle-copy-button');
  const click = async count => {
    button().click();
    await wait(() => clipboard.pending.length === count && button()?.textContent === 'Copying...', 'Wordle must clear previous feedback while the new copy is pending');
  };
  try {
    document.querySelector('.wordle-share-trigger').click();
    await wait(button, 'Wordle share dialog must open');
    await click(1); clipboard.pending[0].resolve();
    await wait(() => button().textContent === 'Copied!', 'Wordle must show confirmed success');
    await click(2); clipboard.pending[1].reject(new Error('Clipboard rejected'));
    await wait(() => button().textContent === 'Copy failed', 'A failed retry must replace prior success');
    await pause(1100);
    check(button().textContent === 'Copy failed', 'The old success timer must not clear newer failure feedback');

    await click(3); await click(4); clipboard.pending[3].resolve();
    await wait(() => button().textContent === 'Copied!', 'Latest overlapping copy must succeed');
    clipboard.pending[2].reject(new Error('Older attempt rejected')); await pause(30);
    check(button().textContent === 'Copied!', 'An older failure must not replace a newer success');

    await click(5); await click(6); clipboard.pending[5].reject(new Error('Latest attempt rejected'));
    await wait(() => button().textContent === 'Copy failed', 'Latest overlapping copy must report failure');
    clipboard.pending[4].resolve(); await pause(30);
    check(button().textContent === 'Copy failed', 'An older success must not replace a newer failure');

    await click(7);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    await wait(() => !button(), 'Share dialog must close');
    clipboard.pending[6].resolve(); await pause(30);
    document.querySelector('.wordle-share-trigger').click(); await wait(button, 'Share dialog must reopen');
    check(button().textContent === 'Copy', 'Completion after dialog closure must not leak into the next session');
    clipboard.unavailable(); button().click();
    await wait(() => button().textContent === 'Copy failed', 'Missing clipboard with failed fallback must not report success');
    return { passed: true, cases: 7 };
  } finally { clipboard.restore(); }
}

export async function exerciseReverbIncidentCopyFeedback(root = document) {
  const clipboard = clipboardFixture();
  const incident = root.querySelector('.incident-card');
  const recording = root.querySelector('.recording-summary');
  const toast = root.querySelector('#toast');
  const context = (target, shiftKey = false) => {
    const event = new MouseEvent('contextmenu', { button: 2, shiftKey, bubbles: true, cancelable: true });
    target.dispatchEvent(event); return event;
  };
  try {
    check(incident && recording && toast, 'Reverb incident, recording, and toast fixtures are required');
    for (const target of [incident, recording]) {
      target.dispatchEvent(new PointerEvent('pointerdown', { button: 2, pointerType: 'mouse', pointerId: 19, shiftKey: true, bubbles: true }));
      check(!context(target, true).defaultPrevented, 'Shift+right-click must retain the native context menu');
      await pause(560);
      check(clipboard.pending.length === 0, 'Shift+right-click must not arm incident copying');
      check(!root.querySelector('#recordingMenu')?.classList.contains('show'), 'Shift+right-click must not open the recording menu');
    }
    check(context(incident).defaultPrevented, 'Ordinary incident context menu must still copy');
    await wait(() => clipboard.pending.length === 1 && toast.textContent === 'Copying incident…', 'Incident success must wait for clipboard confirmation');
    clipboard.pending[0].resolve(); await wait(() => toast.textContent === 'Incident copied', 'Confirmed incident copy must report success');
    context(incident); await wait(() => clipboard.pending.length === 2, 'Second incident copy must start');
    clipboard.pending[1].reject(new Error('Clipboard rejected'));
    await wait(() => toast.textContent === 'Could not copy incident' && toast.dataset.tone === 'error', 'Incident failure must be honest');
    context(incident); context(incident); await wait(() => clipboard.pending.length === 4, 'Overlapping incident copies must start');
    clipboard.pending[3].resolve(); await wait(() => toast.textContent === 'Incident copied', 'Latest incident copy must succeed');
    clipboard.pending[2].reject(new Error('Older attempt rejected')); await pause(30);
    check(toast.textContent === 'Incident copied', 'Old incident failure must not replace the latest success');
    clipboard.unavailable(); context(incident);
    await wait(() => toast.textContent === 'Could not copy incident', 'Unavailable clipboard must not report incident success');
    check(context(recording).defaultPrevented, 'Ordinary recording context menu must remain available');
    await wait(() => root.querySelector('#recordingMenu')?.getAttribute('aria-hidden') === 'false', 'Ordinary recording context menu must open');
    return { passed: true, cases: 6 };
  } finally { clipboard.restore(); }
}
