// Shared by Playwright and the connected original-profile browser QA runner.
// Dispatch both downs in one JS task: no pointerup or Solid render may separate them.
export async function exerciseOverlappingInput(game) {
  const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
  const wait = async (read, label) => {
    const end = performance.now() + 8000;
    while (performance.now() < end) { const value = read(); if (value) return value; await pause(10); }
    throw new Error(`${game}: timed out waiting for ${label}`);
  };
  const check = (value, message) => { if (!value) throw new Error(`${game}: ${message}`); };
  const query = selector => document.querySelector(selector);
  const all = selector => [...document.querySelectorAll(selector)];
  const pointer = (node, type, id) => node.dispatchEvent(new PointerEvent(type, {
    bubbles: true, cancelable: true, pointerType: 'touch', pointerId: id,
    isPrimary: id === 1, button: 0, buttons: type === 'pointerdown' ? 1 : 0,
  }));
  const down = (node, id) => pointer(node, 'pointerdown', id);
  const up = (node, id) => pointer(node, 'pointerup', id);
  const compatibilityClick = node => node.dispatchEvent(new PointerEvent('click', {
    bubbles: true, cancelable: true, pointerType: 'touch', pointerId: 1, detail: 0,
  }));
  const stat = label => all('.ai-game .ai-stat').find(node => node.querySelector('span')?.textContent === label)?.querySelector('strong')?.textContent;
  if (!query(`[data-game-card="${game}"]`)) {
    query('.ai-wordmark')?.click();
    await wait(() => query(`[data-game-card="${game}"]`), 'library');
  }
  query(`[data-game-card="${game}"]`).click();
  await wait(() => query(`[data-game="${game}"] button`), 'game');
  const start = query('.ai-game .ai-ready .ai-primary');
  if (start) {
    start.click();
    await wait(() => !query('.ai-game .ai-ready'), 'started game render');
  }

  if (['sequence', 'sequence-fresh', 'reverse', 'reverse-fresh'].includes(game)) {
    const capture = async () => {
      const flashed = [];
      let previous = -1;
      await wait(() => {
        const tiles = all('.ai-memory-board button');
        const lit = tiles.findIndex(node => node.classList.contains('is-lit'));
        if (lit >= 0 && lit !== previous) flashed.push(lit);
        previous = lit;
        return query('.ai-memory-status')?.textContent.startsWith('Your turn');
      }, 'sequence recall');
      return game.startsWith('reverse') ? flashed.reverse() : flashed;
    };
    const first = await capture();
    check(first.length === 1, `expected first flash, got ${first}`);
    let tiles = all('.ai-memory-board button');
    down(tiles[first[0]], 1); up(tiles[first[0]], 1);
    await pause(150);
    const second = await capture();
    check(second.length === 2, `expected two flashes, got ${second}`);
    tiles = all('.ai-memory-board button');
    down(tiles[second[0]], 1);
    down(tiles[second[1]], 2);
    up(tiles[second[1]], 2); up(tiles[second[0]], 1);
    compatibilityClick(tiles[second[0]]);
    await wait(() => stat('Level') === '3', 'both overlapping sequence presses');
    check(!query('.ai-result'), 'compatibility click or overlap ended sequence');
  } else if (game === 'visual') {
    await wait(() => all('.ai-memory-board button.is-lit').length === 3, 'visible pattern');
    const targets = all('.ai-memory-board button').filter(node => node.classList.contains('is-lit'));
    await wait(() => query('.ai-memory-status')?.textContent.startsWith('Your turn'), 'pattern recall');
    down(targets[0], 1); down(targets[0], 2); down(targets[1], 3); down(targets[2], 4);
    for (const [i, node] of [targets[0], targets[0], targets[1], targets[2]].entries()) up(node, i + 1);
    compatibilityClick(targets[0]);
    await wait(() => stat('Level') === '2', 'overlapping pattern completion');
    check(stat('Mistakes') === '0 / 3', 'same-cell overlap caused a mistake');
  } else if (game === 'chimp' || game === 'number-order') {
    await wait(() => all('.ai-memory-board button').some(node => node.textContent === '1'), 'number board');
    const tiles = all('.ai-memory-board button');
    const ordered = [1, 2, 3].map(value => tiles.find(node => node.textContent === String(value)));
    down(ordered[0], 1); down(ordered[0], 2); down(ordered[1], 3); down(ordered[2], 4);
    for (const [i, node] of [ordered[0], ordered[0], ordered[1], ordered[2]].entries()) up(node, i + 1);
    compatibilityClick(ordered[0]);
    await pause(40);
    check(!query('.ai-memory-continue'), 'same-cell overlap lost a chimp life');
    if (game === 'number-order') {
      check(stat('Next') === '4', 'rapid ordered presses were lost');
      check(Number(stat('Mistakes')) === 0, 'completed cell was counted as another mistake');
    } else check(ordered.every(node => node.getAttribute('aria-disabled') === 'true'), 'chimp did not consume all three numbers');
  } else if (game === 'pairs') {
    const cards = all('.pair-card');
    const name = node => node.getAttribute('aria-label').replace(/^Card \d+, /, '');
    const match = cards.find((node, index) => index > 0 && name(node) === name(cards[0]));
    check(!!match, 'study deck has no matching card');
    const ready = query('.pair-ready');
    down(ready, 1); up(ready, 1);
    ready.dispatchEvent(new PointerEvent('click', { bubbles: true, pointerType: 'touch', detail: 1 }));
    await wait(() => query('.pair-status-line')?.textContent === 'Find every pair.', 'concealed pair deck');
    down(cards[0], 1); down(cards[0], 2); down(match, 3);
    up(cards[0], 1); up(cards[0], 2); up(match, 3);
    compatibilityClick(cards[0]);
    await wait(() => all('.pair-card.is-matched').length === 2, 'overlapping pair');
    check(query('.ai-lives strong')?.getAttribute('aria-label') === '3 lives', 'same card overlap lost a life');
  } else if (game === 'cps') {
    const pad = await wait(() => query('.ai-tap-pad'), 'tap pad');
    down(pad, 1); down(pad, 2); down(pad, 2);
    up(pad, 2); up(pad, 1); compatibilityClick(pad);
    await wait(() => stat('Taps') === '2', 'independent touch taps');
  } else if (game === 'aim') {
    const first = await wait(() => query('.ai-aim-target'), 'aim start');
    down(first, 1); down(first, 2);
    up(first, 1); up(first, 2);
    await wait(() => query('.ai-aim-target[data-target-serial]'), 'first target');
    check(stat('Targets') === '0 / 30', 'second finger scored an unseen first target');
    const target = query('.ai-aim-target');
    down(target, 3); down(target, 4);
    up(target, 3); up(target, 4); compatibilityClick(target);
    await wait(() => stat('Targets') === '1 / 30', 'one target hit');
    check(Number(stat('Misses')) === 0, 'stale target became a miss');
  } else if (game === 'verbal') {
    await wait(() => query('.ai-word-choices button'), 'word choices');
    const fresh = all('.ai-word-choices button').find(node => node.textContent === 'New');
    down(fresh, 1); down(fresh, 2);
    up(fresh, 2); up(fresh, 1); compatibilityClick(fresh);
    await wait(() => stat('Score') === '1', 'one displayed word answer');
    compatibilityClick(fresh);
    await pause(40);
    check(stat('Score') === '1', 'late native click answered the following word');
    check(query('.ai-lives strong')?.getAttribute('aria-label') === '3 lives', 'overlap answered an unseen word');
  } else if (['rotation', 'patterns', 'stroop', 'search'].includes(game)) {
    await wait(() => query('[data-answer="0"]'), 'thinking choices');
    const answers = all('[data-answer]');
    const manual = game === 'rotation' || game === 'patterns';
    const promptSelector = game === 'rotation' ? '.ai-thinking-shapes' : '.ai-thinking-sequence';
    const promptBefore = manual ? query(promptSelector).innerHTML : '';
    if (game === 'rotation') {
      const descriptions = all('.ai-thinking-shapes svg[role="img"]').map(node => node.getAttribute('aria-label'));
      check(descriptions.length === 2 && descriptions[0].startsWith('Original shape.') && descriptions[1].startsWith('Compare shape.'), 'rotation shapes lack distinct accessible identities');
      for (const description of descriptions) {
        check(description.includes('8 filled squares') && /Row 1: columns \d/.test(description), 'shape description omits its occupied grid');
        check(!/mirrored|changed shape|correct answer/i.test(description), 'shape description discloses the answer category');
        const cells = [...description.matchAll(/Row \d+: columns ([\d, ]+)/g)].reduce((count, match) => count + match[1].split(',').length, 0);
        check(cells === 8, 'shape description does not enumerate eight occupied cells');
      }
    }
    let answer = answers[0];
    // Pick a visibly correct first answer in automatic modes. Starting at +1
    // makes either a second correct OR incorrect answer observable in counters.
    if (game === 'stroop') {
      const probe = document.createElement('span');
      const normalized = color => { probe.style.color = color; return probe.style.color; };
      const ink = normalized(query('.ai-thinking-word').style.color);
      check(!!ink, 'could not read rendered ink colour');
      const correct = answers.filter(node => normalized(node.style.getPropertyValue('--answer-ink')) === ink);
      check(correct.length === 1, 'ink colour did not identify one answer');
      const stimulus = query('.ai-thinking-word');
      const colourName = correct[0].getAttribute('aria-label').split(',')[0];
      check(stimulus.getAttribute('role') === 'img', 'Stroop stimulus lacks a named composite role');
      check(stimulus.getAttribute('aria-label') === `Printed word: ${stimulus.textContent}. Ink colour: ${colourName}.`, 'accessible Stroop stimulus differs from its visible word or ink');
      answer = correct[0];
    } else if (game === 'search') {
      const directions = answers.map(node => {
        const label = node.getAttribute('aria-label');
        const angle = Number(node.querySelector('svg g').getAttribute('transform').match(/rotate\(([-\d]+)\)/)[1]);
        const expected = ['right', 'down', 'left', 'up'][((angle / 90) % 4 + 4) % 4];
        check(label.endsWith(`arrow pointing ${expected}`), 'accessible direction differs from the displayed arrow');
        return label.match(/arrow pointing (\w+)$/)[1];
      });
      const correct = answers.filter((_, index) => directions.filter(direction => direction === directions[index]).length === 1);
      check(correct.length === 1, 'accessible names did not identify one distinct direction');
      answer = correct[0];
    }
    down(answer, 1); down(answer, 2);
    up(answer, 2); up(answer, 1);
    await pause(40);
    compatibilityClick(answer);
    await pause(40);
    if (manual) {
      check(!!query('[data-next]'), 'answer release advanced past the manual Next step');
      check(query(promptSelector).innerHTML === promptBefore, 'overlap advanced the manual prompt');
      // Repeated identical answers to this unchanged prompt have the same
      // correctness, so they cannot hide behind a net score of zero.
      check(Number(stat('Score')) + Number(stat('Mistakes')) === 1, 'unchanged prompt was scored more than once');
    } else {
      check(Number(stat('Score')) === 1 && Number(stat('Mistakes')) === 0, 'overlap or late native click answered beyond the one correct question');
    }
  } else if (game === 'arithmetic' || game === 'number') {
    const selector = game === 'number' ? '.ai-number-keypad' : '.ai-thinking-keypad';
    await wait(() => query(`${selector} button`), 'keypad');
    const keys = all(`${selector} button`);
    const one = keys.find(node => node.textContent === '1');
    const two = keys.find(node => node.textContent === '2');
    down(one, 1); down(two, 2); down(two, 2);
    compatibilityClick(two);
    const input = query(game === 'number' ? '.ai-number-input' : '#ai-thinking-entry');
    check(input.value === '12', `same-frame digits were lost or repeated: ${input.value}`);
    pointer(one, 'pointercancel', 1); down(one, 1);
    check(input.value === '121', 'cancelled pointer could not press again');
    window.dispatchEvent(new Event('blur')); down(two, 2);
    check(input.value === '1212', 'blur left a stuck pointer');
    up(one, 1); up(two, 2);
    await pause(40);
    check(input.value === '1212', 'staged render replaced the synchronous entry');
  } else throw new Error(`No overlap scenario for ${game}`);
  return { game, passed: true };
}

export async function exerciseResultGate() {
  const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
  const check = (value, message) => { if (!value) throw new Error(`result gate: ${message}`); };
  const wait = async read => { for (let attempt = 0; attempt < 200; attempt++) { const value = read(); if (value) return value; await pause(10); } throw new Error('result gate: missing rendered control'); };
  const query = selector => document.querySelector(selector);
  const pointer = (node, type, id) => node.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: id, pointerType: 'touch', isPrimary: id === 1, button: 0 }));
  if (!query('[data-game-card="number-order"]')) { query('.ai-wordmark')?.click(); await wait(() => query('[data-game-card="number-order"]')); }
  query('[data-game-card="number-order"]').click();
  (await wait(() => query('.ai-game .ai-ready .ai-primary'))).click();
  await wait(() => !query('.ai-game .ai-ready'));
  const tiles = [...document.querySelectorAll('.ai-memory-board button')];
  const ordered = Array.from({ length: 25 }, (_, index) => tiles.find(node => node.textContent === String(index + 1)));
  ordered.forEach((node, index) => pointer(node, 'pointerdown', index + 1));
  // This is deliberately before Solid can update the Restart disabled attribute.
  query('.ai-restart').click();
  const retry = await wait(() => query('.ai-result button'));
  check(retry.disabled, 'result delay was skipped');
  await pause(800);
  check(retry.disabled, 'elapsed delay ignored held fingers');
  ordered.slice(0, -1).forEach((node, index) => pointer(node, 'pointerup', index + 1));
  await pause(20);
  check(retry.disabled, 'last carried finger was ignored');
  pointer(ordered[24], 'pointerup', 25);
  retry.dispatchEvent(new PointerEvent('click', { bubbles: true, pointerId: 25, pointerType: 'touch', detail: 1 }));
  await pause(30);
  check(!!query('.ai-result'), 'carried release clicked through to replay');
  check(!retry.disabled, 'released result did not unlock');
  pointer(retry, 'pointerdown', 30); pointer(retry, 'pointerup', 30);
  retry.dispatchEvent(new PointerEvent('click', { bubbles: true, pointerId: 30, pointerType: 'touch', detail: 1 }));
  await wait(() => !query('.ai-result'));
  check(query('.ai-memory-status')?.textContent === 'Select 1 to start.', 'fresh post-delay press failed to replay');
  return { game: 'result-gate', passed: true };
}
