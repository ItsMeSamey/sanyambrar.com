import { expect, test } from 'bun:test';
import { createToolCopyStatus } from '../src/tools/copyStatus.ts';

function harness(write: (text: string) => Promise<boolean>) {
  let danger = false;
  let active = true;
  const status = { textContent: '', classList: { toggle(_name: string, value?: boolean) { danger = !!value; return danger; } } };
  const controller = createToolCopyStatus(status, () => active, write);
  return { status, controller, danger: () => danger, dispose() { active = false; } };
}

test('copy reports confirmed success and sends the complete output', async () => {
  let written = '';
  const view = harness(async text => { written = text; return true; });
  await view.controller.copy('  text\n');
  expect(written).toBe('  text\n');
  expect(view.status.textContent).toBe('Copied.');
  expect(view.danger()).toBe(false);
});

test('denied and rejected clipboard writes give actionable feedback', async () => {
  for (const write of [async () => false, async () => { throw Error('Denied'); }]) {
    const view = harness(write);
    await view.controller.copy('text');
    expect(view.status.textContent).toBe('Could not copy. Select the output and copy it manually.');
    expect(view.danger()).toBe(true);
    view.controller.reset();
    expect(view.status.textContent).toBe('');
    expect(view.danger()).toBe(false);
  }
});

test('editing output invalidates a pending copy result', async () => {
  let complete!: (value: boolean) => void;
  const view = harness(() => new Promise(resolve => { complete = resolve; }));
  const pending = view.controller.copy('old output');
  expect(view.status.textContent).toBe('Copying...');
  view.controller.reset();
  complete(false);
  await pending;
  expect(view.status.textContent).toBe('');
  expect(view.danger()).toBe(false);
});

test('a late old copy cannot replace the latest result', async () => {
  const completions: Array<(value: boolean) => void> = [];
  const view = harness(() => new Promise(resolve => { completions.push(resolve); }));
  const old = view.controller.copy('first');
  const latest = view.controller.copy('second');
  completions[1](true);
  await latest;
  completions[0](false);
  await old;
  expect(view.status.textContent).toBe('Copied.');
  expect(view.danger()).toBe(false);
});

test('navigation prevents a pending copy from updating the disposed view', async () => {
  let complete!: (value: boolean) => void;
  const view = harness(() => new Promise(resolve => { complete = resolve; }));
  const pending = view.controller.copy('output');
  view.dispose();
  complete(true);
  await pending;
  expect(view.status.textContent).toBe('Copying...');
});
