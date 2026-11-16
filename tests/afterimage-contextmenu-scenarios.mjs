// Run against the real compiled App with the shared theme menu installed first.
export async function exerciseGameContextMenu(game) {
  const query = selector => document.querySelector(selector);
  const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
  const check = (value, message) => { if (!value) throw new Error(`${game}: ${message}`); };
  const wait = async (read, label, timeout = 5000) => {
    const end = performance.now() + timeout;
    while (performance.now() < end) { if (read()) return; await pause(10); }
    throw new Error(`${game}: timed out waiting for ${label}`);
  };
  const menu = () => query('#samey-context-menu');
  const closeMenu = () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
  const context = (target, expected, native = false) => {
    const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true, button: 2, shiftKey: native });
    target.dispatchEvent(event);
    check(event.defaultPrevented !== native, native ? 'native Shift-right-click override was blocked' : 'browser context menu was not cancelled');
    check(menu().hidden !== expected, expected ? 'normal page menu did not open' : 'game surface opened the shared menu');
    if (expected) { closeMenu(); check(menu().hidden, 'page menu did not close with Escape'); }
  };
  let pointer = 300;
  const down = (target, id) => target.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerType: 'touch', pointerId: id, button: 0, buttons: 1 }));
  const up = (target, id, cancel = false) => target.dispatchEvent(new PointerEvent(cancel ? 'pointercancel' : 'pointerup', { bubbles: true, cancelable: true, pointerType: 'touch', pointerId: id, button: 0, buttons: 0 }));
  const touch = async target => { const id = ++pointer; down(target, id); up(target, id); await pause(20); };
  if (!query(`[data-game-card="${game}"]`)) {
    query('.ai-wordmark').click();
    await wait(() => query(`[data-game-card="${game}"]`), 'library');
  }
  query(`[data-game-card="${game}"]`).click();
  await wait(() => query('.ai-game')?.children.length && !query('.ai-game .ai-loading'), 'game');
  await wait(() => query('.ai-game button'), 'game controls');
  check(!!menu(), 'shared runtime menu is missing');
  context(query('.ai-play-heading h1'), true);
  const ready = query('.ai-game .ai-ready .ai-primary');
  if (ready) { ready.click(); await pause(40); }
  const surface = () => query('.ai-game [data-game-input]');
  await wait(surface, 'active game surface');
  context(surface().querySelector('button, strong, h2, svg') ?? surface(), false);
  context(surface(), false, true);
  // Header/history text remains outside the game's ownership even during a run.
  context(query('.ai-history h2'), true);

  if (game === 'reaction') {
    const pad = query('.ai-reaction-pad');
    const state = () => query('.ai-reaction-game').dataset.state;
    let id = ++pointer;
    down(pad, id);
    await wait(() => state() === 'waiting', 'touch wait');
    await pause(550);
    context(pad.querySelector('strong'), false);
    check(state() === 'waiting', 'long-press context menu changed trial state');
    await wait(() => state() === 'go', 'release cue');
    context(pad, false);
    up(pad, id);
    await wait(() => state() === 'between', 'first touch sample');
    check(query('.ai-stats').textContent.includes('2 / 5'), 'release was not scored exactly once');
    id = ++pointer;
    down(pad, id);
    context(pad, false);
    await pause(150);
    check(state() === 'between', 'held retry bypassed 750ms guard');
    await wait(() => state() === 'waiting', 'held retry resumes');
    up(pad, id, true);
    await wait(() => state() === 'ready', 'pointer cancellation');
    check(!query('.ai-result'), 'cancelled touch created a result');
    pad.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));
    pad.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', bubbles: true, cancelable: true }));
    await wait(() => state() === 'waiting', 'keyboard wait');
    context(pad, false);
    pad.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));
    pad.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', bubbles: true, cancelable: true }));
    await wait(() => state() === 'early', 'keyboard early response');
    window.dispatchEvent(new Event('blur'));
    await wait(() => !query('[aria-label="Restart"]').disabled, 'early response retry delay');
    query('[aria-label="Restart"]').click();
    await wait(() => query('.ai-reaction-game')?.dataset.state === 'ready', 'fresh reaction run');
    const freshPad = query('.ai-reaction-pad');
    for (let trial = 0; trial < 5; trial++) {
      if (trial) await pause(800);
      id = ++pointer;
      down(freshPad, id);
      await wait(() => state() === 'waiting', `trial ${trial + 1} wait`);
      context(freshPad, false);
      await wait(() => state() === 'go', `trial ${trial + 1} cue`);
      up(freshPad, id);
      await wait(() => state() === (trial === 4 ? 'result' : 'between'), 'sample');
    }
    check(query('.ai-result .ai-primary').disabled, 'result bypassed 750ms retry delay');
    check(!freshPad.hasAttribute('data-game-input'), 'terminal surface still disables callout/selection');
    context(freshPad, true);
    const scroll = new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerId: ++pointer, pointerType: 'touch', button: 0 });
    freshPad.dispatchEvent(scroll);
    check(!scroll.defaultPrevented, 'terminal surface prevents scrolling');
    up(freshPad, pointer);
    await wait(() => !query('.ai-result .ai-primary').disabled, 'result delay release');
  } else if (game === 'aim') {
    await touch(query('.ai-aim-target'));
    for (let hit = 0; hit < 30; hit++) {
      const oldTarget = query('.ai-aim-target');
      context(query('.ai-aim-target svg'), false);
      await touch(query('.ai-aim-target'));
      check(!query('.ai-aim-exit'), 'consumed target leaves a fade-out ghost');
      if (hit < 29) check(query('.ai-aim-target') !== oldTarget, 'new target did not get a fresh appearance');
    }
    await wait(() => query('.ai-result'), 'aim completion');
    check(!query('.ai-aim-arena').hasAttribute('data-game-input'), 'finished aim remains guarded');
    context(query('.ai-aim-arena'), true);
  } else if (game === 'cps') {
    const pad = query('.ai-tap-pad');
    const id = ++pointer;
    down(pad, id);
    context(pad, false);
    await wait(() => query('.ai-result'), 'tap completion', 11000);
    await pause(800);
    check(query('.ai-result .ai-primary').disabled, 'held finishing finger bypassed retry gate');
    check(!pad.hasAttribute('data-game-input'), 'finished tapping remains guarded');
    context(pad, true);
    up(pad, id);
    await wait(() => !query('.ai-result .ai-primary').disabled, 'held finger released');
  } else if (game === 'number' || game === 'arithmetic') {
    await wait(() => query('.ai-game input'), 'editable answer');
    context(query('.ai-game input'), true);
    context(query('.ai-game .ai-number-key, .ai-thinking-keypad button'), false);
  }
  return { game, passed: true };
}
