// Reused by the browser suite and the compiled Solid DOM fixture.
export async function exerciseKeyboardOwnership(game) {
  const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
  const query = selector => document.querySelector(selector);
  const check = (value, message) => { if (!value) throw new Error(`${game}: ${message}`); };
  const wait = async (read, label) => {
    const end = performance.now() + 8000;
    while (performance.now() < end) { if (read()) return; await pause(10); }
    throw new Error(`${game}: timed out waiting for ${label}`);
  };
  const key = (target, value, options = {}, prevented = false) => {
    const event = new KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true, ...options });
    if (prevented) event.preventDefault();
    target.dispatchEvent(event);
    return event;
  };
  const release = value => window.dispatchEvent(new KeyboardEvent('keyup', { key: value, bubbles: true }));
  if (!query(`[data-game-card="${game}"]`)) {
    query('.ai-wordmark').click();
    await wait(() => query(`[data-game-card="${game}"]`), 'library');
  }
  query(`[data-game-card="${game}"]`).click();
  await wait(() => query(`[data-game="${game}"] button`), 'game');
  const start = query('.ai-ready .ai-primary');
  if (start) {
    start.click();
    await wait(() => !query('.ai-ready'), 'started game');
  }
  if (game === 'number-order' || game === 'pairs') {
    if (game === 'pairs') {
      const ready = query('.pair-ready');
      key(ready, 'Enter'); release('Enter');
      await wait(() => query('.pair-status-line')?.textContent === 'Find every pair.', 'concealed deck');
      await wait(() => document.activeElement === query('.pair-card'), 'initial card focus');
    }
    const tiles = [...document.querySelectorAll(game === 'pairs' ? '.pair-card' : '.ai-memory-board button')];
    const target = tiles[1];
    target.focus();
    const before = query('.ai-game').textContent;
    for (const options of [{ altKey: true }, { ctrlKey: true }, { metaKey: true }, { isComposing: true }]) {
      for (const value of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter', ' ', ...(game === 'pairs' ? ['Home', 'End'] : [])]) {
        check(!key(target, value, options).defaultPrevented, `consumed ${value} owned by a modifier or composition`);
        check(document.activeElement === target, `moved focus for modified ${value}`);
      }
    }
    for (const value of ['ArrowLeft', 'Enter', ' ']) key(target, value, {}, true);
    await pause(20);
    check(document.activeElement === target, 'moved focus after an already consumed key');
    check(query('.ai-game').textContent === before, 'modified or consumed activation changed the game');
    check(key(target, 'ArrowLeft').defaultPrevented, 'plain arrow did not move focus');
    check(document.activeElement === tiles[0], 'plain left arrow missed the previous tile');
    const first = game === 'pairs' ? tiles[0] : tiles.find(tile => tile.textContent === '1');
    first.focus();
    key(first, 'Enter');
    key(first, 'Enter', { repeat: true });
    release('Enter');
    await pause(30);
    if (game === 'pairs') check(document.querySelectorAll('.pair-card.is-open').length === 1, 'normal or repeated activation opened the wrong number of cards');
    else check([...document.querySelectorAll('.ai-stat')].find(stat => stat.querySelector('span')?.textContent === 'Next')?.querySelector('strong')?.textContent === '2', 'normal activation did not advance exactly once');
  } else {
    await wait(() => query('.ai-thinking-play'), 'thinking controls');
    await pause(30);
    const target = query(game === 'arithmetic' ? '#ai-thinking-entry' : '[data-answer="0"]');
    const snapshot = () => [query('.ai-thinking-feedback')?.textContent, ...[...document.querySelectorAll('.ai-thinking .ai-stat')].slice(1).map(node => node.textContent)].join('|');
    const before = snapshot();
    const value = game === 'arithmetic' ? 'Enter' : game === 'search' ? 'ArrowRight' : '1';
    const options = game === 'arithmetic' ? { repeat: true } : {};
    const opener = query('button[aria-label="Search"]');
    opener.focus();
    check(!key(opener, value, options).defaultPrevented, 'consumed a header key');
    opener.click();
    await wait(() => query('.site-search:not([hidden]) input'), 'Search dialog');
    const searchInput = query('.site-search input');
    searchInput.value = 'no-result-keyboard-ownership-fixture';
    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    searchInput.focus();
    // Search owns its editing/navigation keys. Game counters must remain unchanged.
    key(searchInput, value, options);
    // Even a queued game event must yield while another surface owns the top layer.
    check(!key(target, value, options).defaultPrevented, 'consumed a game key beneath an open overlay');
    await pause(20);
    check(snapshot() === before, 'answered beneath the dialog');
    key(searchInput, 'Escape');
    await wait(() => !query('.site-search:not([hidden])'), 'closed Search dialog');
    await wait(() => document.activeElement === opener, 'restored dialog opener focus');
    target.focus();
    key(target, value, options, true);
    for (const modifier of [{ altKey: true }, { ctrlKey: true }, { metaKey: true }, { isComposing: true }]) {
      check(!key(target, value, { ...options, ...modifier }).defaultPrevented, 'consumed a modified or composing key');
    }
    if (!['arithmetic', 'search'].includes(game)) {
      const editor = document.createElement('input');
      query('.ai-thinking').append(editor);
      editor.focus();
      check(!key(editor, '1').defaultPrevented, 'consumed input text');
      editor.remove();
      target.focus();
      key(target, '1', { repeat: true });
    }
    await pause(20);
    check(snapshot() === before, 'consumed or repeated keys changed the question');
    check(document.activeElement === target, 'consumed keys moved game focus');
    check(key(target, value, options).defaultPrevented, 'owned game key stopped working');
    if (game === 'search') await wait(() => document.activeElement === query('[data-answer="1"]'), 'search arrow navigation');
    else if (game !== 'arithmetic') await wait(() => snapshot() !== before, 'numeric answer');
  }
  return { game, passed: true };
}
