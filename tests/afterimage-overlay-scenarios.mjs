// Reused by browser QA and the compiled Solid DOM fixture.
export async function exerciseGameOverlayOwnership(game) {
  const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
  const query = selector => document.querySelector(selector);
  const check = (value, message) => { if (!value) throw new Error(`${game}: ${message}`); };
  const wait = async (read, label) => {
    const end = performance.now() + 10000;
    while (performance.now() < end) { if (read()) return; await pause(10); }
    throw new Error(`${game}: timed out waiting for ${label}`);
  };
  if (!query(`[data-game-card="${game}"]`)) {
    query('.ai-wordmark').click();
    await wait(() => query(`[data-game-card="${game}"]`), 'library');
  }
  query(`[data-game-card="${game}"]`).click();
  await wait(() => query(`[data-game="${game}"] button`), 'game');
  const speed = ['reaction', 'aim', 'cps'].includes(game);
  const pointer = (target, type) => target.dispatchEvent(new PointerEvent(type, { pointerId: 71, pointerType: 'touch', button: 0, bubbles: true, cancelable: true }));
  const start = query('.ai-ready .ai-primary, .pair-ready, .ai-reaction-pad, .ai-aim-target, .ai-tap-pad');
  check(start, 'missing Start control');
  start.focus();
  if (speed) {
    const before = query('.ai-game').textContent;
    for (const options of [{ ctrlKey: true }, { altKey: true }, { metaKey: true }, { consumed: true }]) {
      const event = new MouseEvent('click', { detail: 0, bubbles: true, cancelable: true, ...options });
      if (options.consumed) event.preventDefault();
      start.dispatchEvent(event);
      check(event.defaultPrevented === !!options.consumed, 'consumed a modified virtual click');
    }
    for (const options of [{ ctrlKey: true }, { altKey: true }, { metaKey: true }, { isComposing: true }, { consumed: true }]) {
      for (const key of ['Enter', ' ']) {
        const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...options });
        if (options.consumed) event.preventDefault();
        start.dispatchEvent(event);
        check(event.defaultPrevented === !!options.consumed, 'consumed a modified/composing key');
        start.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true }));
      }
    }
    await pause(30);
    check(query('.ai-game').textContent === before, 'modified/composing/consumed keys changed the game');
    pointer(start, 'pointerdown');
    if (game !== 'reaction') pointer(start, 'pointerup');
  } else start.click();
  const live = () => {
    if (speed) return query('.ai-speed')?.dataset.state === (game === 'reaction' ? 'waiting' : 'running');
    if (game === 'rhythm') return query('.rhythm-game')?.dataset.phase === 'listen';
    if (game.startsWith('tracking')) return query('.ai-tracking-game')?.dataset.phase === 'mark';
    if (game === 'pairs') return query('.pair-memory')?.dataset.phase === 'ready';
    return !query('.ai-ready');
  };
  await wait(live, 'active game');
  const retainedInput = query('.rhythm-pad, .ai-tracking-ball, .ai-memory-tile, .pair-card, [data-answer], [data-challenge-choice], .ai-word-choices button, .ai-number-input, .ai-reaction-pad, .ai-aim-target, .ai-tap-pad');
  const layer = document.createElement('div');
  layer.setAttribute('popover', 'manual');
  const action = document.createElement('button');
  action.textContent = 'Overlay action';
  let actions = 0;
  action.addEventListener('click', () => actions++);
  layer.append(action); document.body.append(layer); layer.showPopover(); action.focus();
  // Reaction owns a document-level release, even when a second finger opens UI.
  if (game === 'reaction') pointer(document, 'pointerup');
  const interrupted = () => {
    if (speed) return query('.ai-speed')?.dataset.state === 'ready';
    if (game === 'rhythm') return query('.rhythm-game')?.dataset.phase === 'cancelled';
    if (game.startsWith('tracking')) return query('.ai-tracking-game')?.dataset.phase === 'interrupted';
    if (game === 'pairs') return query('.pair-memory')?.dataset.phase === 'cancelled';
    return !!query('.ai-ready');
  };
  await wait(interrupted, 'unscored interruption');
  // Cover delayed autofocus and the failure/restart gate, then try all direct routes.
  await pause(game === 'reaction' ? 2700 : 850);
  check(document.activeElement === action, 'delayed autofocus stole overlay focus');
  check(layer.matches(':popover-open'), 'game closed the overlay');
  const before = query('.ai-game').textContent;
  for (const target of [retainedInput, query('.ai-ready .ai-primary, .pair-replay, .ai-result button'), query('.ai-speed-practice')].filter(Boolean)) {
    for (const key of ['Enter', ' ', 'ArrowRight', '1']) {
      target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
      target.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true, cancelable: true }));
    }
    target.click();
    pointer(target, 'pointerdown'); pointer(target, 'pointerup');
  }
  action.click();
  await pause(30);
  check(actions === 1, 'overlay action stopped working');
  check(document.activeElement === action, 'covered input stole focus');
  check(query('.ai-game').textContent === before, 'covered keyboard/native-click input changed the game');
  layer.hidePopover(); layer.remove();
  await pause(30);
  const restart = query('.ai-ready .ai-primary, .pair-replay, .ai-result button, .ai-reaction-pad, .ai-aim-target, .ai-tap-pad');
  check(restart && !restart.disabled, 'restart did not unlock after dismissal');
  restart.focus();
  if (speed) {
    pointer(restart, 'pointerdown');
    if (game !== 'reaction') pointer(restart, 'pointerup');
  } else restart.click();
  await pause(30);
  check(!interrupted(), 'deliberate activation did not restart after dismissal');
  if (game === 'number' || game === 'verbal') {
    const selector = game === 'number' ? '.ai-number-input' : '.ai-word-choices button';
    await wait(() => query(selector), 'word input after restart');
    const target = query(selector), key = game === 'number' ? '1' : 'Enter';
    const snapshot = () => game === 'number' ? target.value : query('.ai-game').textContent;
    const before = snapshot();
    const consumed = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    consumed.preventDefault(); target.dispatchEvent(consumed);
    target.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true }));
    await pause(30);
    check(snapshot() === before, 'already-consumed word input changed the game');
    target.focus(); target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    target.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true }));
    await pause(30);
    check(snapshot() !== before, 'fresh word input did not respond after dismissal');
  }
  return { game, overlayFocusPreserved: true, coveredInputBlocked: true, restartAvailable: true };
}
