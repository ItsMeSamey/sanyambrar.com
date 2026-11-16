// Shared with the original-profile browser runner.
export async function exerciseNumberOrderClock() {
  const query = selector => document.querySelector(selector);
  const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
  const check = (value, message) => { if (!value) throw new Error(`Number Order clock: ${message}`); };
  const wait = async (read, label) => {
    const end = performance.now() + 8000;
    while (performance.now() < end) { if (read()) return; await pause(10); }
    throw new Error(`Number Order clock: timed out waiting for ${label}`);
  };
  const phase = () => query('.ai-memory-game')?.dataset.phase;
  const stat = label => [...document.querySelectorAll('.ai-game .ai-stat')].find(node => node.querySelector('span')?.textContent === label)?.querySelector('strong')?.textContent;
  const elapsed = () => Number.parseFloat(stat('Time'));
  const tiles = () => [...document.querySelectorAll('.ai-memory-board button')];
  const scores = () => JSON.parse(localStorage.getItem('afterimage-history-order-v2-keyboard') ?? '[]');
  const oldScores = Object.fromEntries(Object.keys(localStorage).filter(key => key.startsWith('afterimage-history-order-v1-')).map(key => [key, localStorage.getItem(key)]));
  if (!query('[data-game-card="number-order"]')) {
    query('.ai-wordmark')?.click();
    await wait(() => query('[data-game-card="number-order"]'), 'library');
  }
  query('[data-game-card="number-order"]').click();
  await wait(() => query('.ai-ready .ai-primary'), 'preview');
  const count = scores().length;
  await pause(220);
  check(phase() === 'intro' && elapsed() === 0, 'preview starts the clock');
  check(query('.ai-memory-board').inert, 'preview is interactive');
  check(!query('.ai-restart') || query('.ai-restart').disabled, 'preview exposes Restart');
  query('.ai-ready .ai-primary').click();
  await wait(() => elapsed() >= 0.2, 'clock before selecting 1');
  check(phase() === 'running' && stat('Next') === '1', 'clock requires a first answer');
  check(tiles().every(tile => tile.textContent.trim()), 'Start hides the number board');
  check(query('.ai-restart') && !query('.ai-restart').disabled, 'timed run cannot restart before selecting 1');
  query('.ai-restart').click();
  await wait(() => phase() === 'intro', 'header restart before selecting 1');
  check(elapsed() === 0 && scores().length === count, 'header restart keeps elapsed time or saves an unfinished run');
  query('.ai-ready .ai-primary').click();
  await wait(() => elapsed() >= 0.2, 'clock after header restart');
  const beforeFirst = elapsed();
  tiles().find(tile => tile.textContent === '1').click();
  await wait(() => stat('Next') === '2', 'first number');
  check(elapsed() >= beforeFirst, 'selecting 1 resets elapsed time');
  for (let number = 2; number <= 25; number++) tiles().find(tile => tile.textContent === String(number)).click();
  await wait(() => phase() === 'result', 'result');
  const saved = scores();
  check(saved.length === Math.min(200, count + 1), 'completed run was not saved exactly once');
  check(saved.at(-1).value >= beforeFirst && saved.at(-1).rulesVersion === 2, 'score omits time before 1 or uses old rules');
  for (const [key, raw] of Object.entries(oldScores)) check(localStorage.getItem(key) === raw, 'earlier timing history changed');
  await wait(() => !query('.ai-result .ai-primary').disabled, 'retry gate');
  await pause(120);
  query('.ai-result .ai-primary').click();
  await wait(() => phase() === 'running', 'retry');
  check(stat('Next') === '1' && elapsed() < 0.2, 'retry retains the prior clock or board');
  check(query('.ai-restart') && !query('.ai-restart').disabled, 'timed retry cannot restart before selecting 1');
  for (const interruption of ['blur', 'hidden']) {
    await wait(() => elapsed() >= 0.2, `${interruption} pre-answer clock`);
    if (interruption === 'blur') window.dispatchEvent(new Event('blur'));
    else {
      const descriptor = Object.getOwnPropertyDescriptor(document, 'hidden');
      try {
        Object.defineProperty(document, 'hidden', { configurable: true, value: true });
        document.dispatchEvent(new Event('visibilitychange'));
      } finally {
        if (descriptor) Object.defineProperty(document, 'hidden', descriptor);
        else Reflect.deleteProperty(document, 'hidden');
      }
    }
    await wait(() => phase() === 'interrupted', `${interruption} cancellation before 1`);
    const stopped = elapsed();
    await pause(220);
    check(elapsed() === stopped, `${interruption} leaves the timer running`);
    check(JSON.stringify(scores()) === JSON.stringify(saved), `${interruption} scores an unfinished run`);
    query('.ai-ready .ai-primary').click();
    await wait(() => phase() === 'running', `${interruption} restart`);
    check(stat('Next') === '1' && elapsed() < 0.2, `${interruption} restart keeps the old clock`);
  }
  window.dispatchEvent(new Event('blur'));
  await wait(() => phase() === 'interrupted', 'final cancellation');
  return { game: 'number-order', passed: true };
}
