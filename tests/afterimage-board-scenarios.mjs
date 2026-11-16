// Browser geometry assertions also run as structural/input checks in the compiled DOM fixture.
export async function exerciseBoardStability(game) {
  const query = selector => document.querySelector(selector);
  const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
  const check = (value, message) => { if (!value) throw new Error(`${game}: ${message}`); };
  const wait = async (read, label) => {
    const end = performance.now() + 10000;
    while (performance.now() < end) { if (read()) return; await pause(10); }
    throw new Error(`${game}: timed out waiting for ${label}`);
  };
  const boardSelector = game === 'pairs' ? '.pair-board' : '.ai-memory-board';
  const stageSelector = game === 'pairs' ? '.pair-stage' : '.ai-memory-stage';
  const tiles = () => [...query(boardSelector).querySelectorAll('button')];
  const phase = () => query('.ai-memory-game, .pair-memory')?.dataset.phase;
  const press = node => node.click();
  if (!query(`[data-game-card="${game}"]`)) {
    query('.ai-wordmark').click();
    await wait(() => query(`[data-game-card="${game}"]`), 'library');
  }
  query(`[data-game-card="${game}"]`).click();
  await wait(() => query(boardSelector), 'preview board');
  await pause(40);
  const rect = node => {
    const box = node.getBoundingClientRect();
    return [box.x + window.scrollX, box.y + window.scrollY, box.width, box.height];
  };
  const initial = { board: rect(query(boardSelector)), stage: rect(query(stageSelector)), tiles: tiles().map(rect) };
  const geometry = initial.board[2] > 0;
  if (game === 'pairs') {
    check(query('.pair-ready').textContent.trim() === 'Start', 'study action is not concise');
    check(!query('.pair-status-line').textContent.trim(), 'study repeats instructions');
    check(query(stageSelector).contains(query('.pair-ready')), 'Start is outside the fixed board stage');
    if (geometry) {
      const button = query('.pair-ready').getBoundingClientRect(), board = query(boardSelector).getBoundingClientRect(), stage = query(stageSelector).getBoundingClientRect();
      check(button.top >= board.bottom && button.top - board.bottom < 8 && button.bottom <= stage.bottom + 0.6, 'Start is not directly below the board');
    }
  }
  const stages = [];
  const capture = label => {
    check(!!query('.ai-game .ai-stats'), `${label}: metrics disappeared`);
    const current = { board: rect(query(boardSelector)), stage: rect(query(stageSelector)), tiles: tiles().map(rect) };
    for (const field of ['board', 'stage']) {
      check(current[field].every((value, index) => Math.abs(value - initial[field][index]) < 0.6), `${label}: ${field} moved or resized: ${JSON.stringify({ initial: initial[field], current: current[field] })}`);
    }
    check(current.tiles.length === initial.tiles.length, `${label}: tile count changed unexpectedly`);
    check(current.tiles.every((tile, index) => tile.every((value, axis) => Math.abs(value - initial.tiles[index][axis]) < 0.6)), `${label}: tiles moved or resized`);
    stages.push(label);
  };
  const restart = () => query('[aria-label="Restart"]');
  check(!restart() || restart().disabled, 'fresh board exposes Restart');
  const pairNames = game === 'pairs' ? tiles().map(tile => tile.getAttribute('aria-label').replace(/^Card \d+, /, '')) : [];
  const firstFlash = { index: -1 };
  let watch;
  if (game.includes('sequence') || game.startsWith('reverse')) {
    watch = setInterval(() => {
      if (phase() !== 'show') return;
      const lit = tiles().findIndex(tile => tile.classList.contains('is-lit'));
      if (lit >= 0) firstFlash.index = lit;
    }, 5);
  }
  if (game !== 'pairs') press(query('.ai-ready .ai-primary'));
  else press(query('.pair-ready'));
  await wait(() => game === 'pairs' ? phase() === 'ready' : !query('.ai-ready'), 'started board');
  await pause(30);
  capture('start');
  check(!restart() || restart().disabled, 'presentation alone exposes Restart');
  if (game === 'pairs') {
    // Repeatedly choose the same known mismatch, preserving all four card slots.
    const mismatch = pairNames.findIndex((face, index) => index > 0 && face !== pairNames[0]);
    check(mismatch > 0, 'could not identify a mismatch');
    for (let life = 0; life < 3; life++) {
      press(tiles()[0]); await pause(20); capture(`first card ${life}`);
      check(!restart().disabled, 'first card did not enable Restart');
      press(tiles()[mismatch]); await pause(20); capture(`mismatch ${life}`);
      check(query(boardSelector).querySelectorAll('.is-mismatch .pair-mismatch-marker').length === 2, 'mismatch lacks visible cross markers');
      check(!!query('.pair-status-line .ai-sr-only'), 'normal pair feedback repeats the visual cue');
      await wait(() => phase() === (life === 2 ? 'finished' : 'ready'), 'pair resolution');
      capture(`review ${life}`);
    }
  } else if (game === 'visual') {
    for (let life = 0; life < 3; life++) {
      await wait(() => phase() === 'show' && tiles().some(tile => tile.classList.contains('is-lit')), 'visible pattern');
      const misses = tiles().filter(tile => !tile.classList.contains('is-lit')).slice(0, 3);
      await wait(() => phase() === 'recall', 'pattern recall');
      for (const [index, tile] of misses.entries()) {
        press(tile); await pause(20); capture(`life ${life} answer ${index}`);
        if (life === 0 && index === 0) check(!restart().disabled, 'answer did not enable Restart');
      }
    }
  } else if (game === 'chimp') {
    for (let life = 0; life < 3; life++) {
      press(tiles().find(tile => tile.textContent === '2'));
      await pause(30); capture(`wrong answer ${life}`);
      if (life < 2) {
        check(!!query('.ai-memory-status .ai-sr-only'), 'between-round prose duplicates the revealed board');
        const control = query('.ai-memory-continue');
        check(query(stageSelector).contains(control), 'Continue is outside the board stage');
        if (geometry) {
          const button = control.querySelector('button').getBoundingClientRect(), board = query(boardSelector).getBoundingClientRect(), stage = query(stageSelector).getBoundingClientRect();
          check(button.top >= board.bottom && button.bottom <= stage.bottom + 0.6, 'Continue covers review tiles or escapes its stage');
          check(getComputedStyle(control).position === 'absolute', 'Continue participates in layout');
        }
        await wait(() => control.querySelector('button').getAttribute('aria-disabled') === 'false', 'Continue guard');
        await pause(120);
        press(control.querySelector('button'));
        await wait(() => phase() === 'recall', 'continued board');
        capture(`continued ${life}`);
      }
    }
  } else if (game === 'number-order') {
    for (let number = 1; number <= 25; number++) {
      press(tiles().find(tile => tile.textContent === String(number)));
      await pause(10); capture(`answer ${number}`);
      if (number === 1) check(!restart().disabled, 'first number did not enable Restart');
    }
  } else {
    try {
      await wait(() => phase() === 'recall', 'sequence recall');
      check(firstFlash.index >= 0, 'did not capture first flash');
      press(tiles()[(firstFlash.index + 1) % 9]);
      await wait(() => phase() === 'result', 'sequence result');
      capture('wrong answer review');
      check(!!query('.ai-sequence-review'), 'response order disappeared');
      check(query('.ai-memory-status').classList.contains('ai-sr-only'), 'terminal explanation repeats the visual review');
      check(query('.ai-sequence-review figcaption').textContent === 'Expected sequence', 'sequence caption repeats the missed-step explanation');
      check(query('.ai-sequence-review [aria-current="step"]').getAttribute('aria-label').includes('wrong choice'), 'missed step lost accessible choice details');
      check(!/Correct|Not attempted|Chose|Step/.test(query('.ai-sequence-review ol').textContent), 'sequence review repeats text for every tile');
    } finally { clearInterval(watch); }
  }
  await wait(() => query('.ai-result'), 'result');
  capture('result');
  if (game !== 'pairs') check(query('.ai-memory-status').classList.contains('ai-sr-only'), 'terminal status repeats visible board or score');
  check(query(stageSelector).contains(query('.ai-board-result')), 'Restart is outside the fixed board stage');
  check(query('.ai-board-result').querySelectorAll('button').length === 1, 'result has more than one action');
  check(query('.ai-result .ai-primary').textContent.trim() === 'Restart', 'result action is not Restart');
  check(!query('.ai-move-history'), 'full run move history remains');
  if (geometry) {
    const button = query('.ai-result .ai-primary').getBoundingClientRect(), board = query(boardSelector).getBoundingClientRect(), stage = query(stageSelector).getBoundingClientRect();
    check(button.top >= board.bottom && button.bottom <= stage.bottom + 0.6, 'Restart covers final tiles or escapes its stage');
    check(getComputedStyle(query('.ai-board-result')).position === 'absolute', 'Restart participates in board layout');
    check(Number(getComputedStyle(query(boardSelector)).opacity) > .8, 'finished board is too dim to review');
    if (game === 'pairs') check(getComputedStyle(query(boardSelector)).overflowY === 'auto', 'finished cards cannot be scrolled');
  }
  if (game === 'visual') check(tiles().some(tile => tile.classList.contains('is-missed')), 'failed pattern does not reveal missed tiles');
  if (game === 'chimp') check(tiles().filter(tile => tile.getAttribute('aria-label').includes('number ')).every(tile => tile.textContent.trim()), 'failed order hides remaining numbers');
  if (game === 'pairs') check(tiles().every(tile => tile.classList.contains('is-open')), 'failed pairs hide cards');
  const beforeBoard = tiles().map(tile => tile.outerHTML).join('');
  const terminalPress = new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerType: 'touch', pointerId: 77, button: 0 });
  tiles()[0].dispatchEvent(terminalPress);
  tiles()[0].dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerType: 'touch', pointerId: 77 }));
  check(!terminalPress.defaultPrevented, 'finished tile prevents normal pointer scrolling');
  const terminalKey = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true });
  tiles()[0].dispatchEvent(terminalKey);
  check(!terminalKey.defaultPrevented, 'finished tile consumes page navigation');
  check(tiles().map(tile => tile.outerHTML).join('') === beforeBoard, 'finished input changes the final board');
  if (geometry) check(getComputedStyle(tiles()[0]).touchAction === 'pan-y', 'finished tile blocks touch panning');
  await wait(() => !query('.ai-result .ai-primary').disabled, 'retry gate');
  check(!restart().disabled, 'completed run did not enable Restart after gate');
  await pause(120);
  press(query('.ai-result .ai-primary'));
  await wait(() => !query('.ai-result'), 'fresh retry');
  await pause(30); capture('retry');
  check(!restart() || restart().disabled, 'fresh retry leaves Restart enabled');
  return { game, passed: true, geometry, stages };
}
