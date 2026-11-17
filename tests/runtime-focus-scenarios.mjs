// Shared by native-browser checks and the actual-source DOM fixture.
const check = (value, message) => { if (!value) throw new Error(message); };

function holdFrames() {
  const request = globalThis.requestAnimationFrame;
  const cancel = globalThis.cancelAnimationFrame;
  const callbacks = new Map();
  let nextId = -1;
  globalThis.requestAnimationFrame = callback => { const id = nextId--; callbacks.set(id, callback); return id; };
  globalThis.cancelAnimationFrame = id => { if (!callbacks.delete(id)) cancel(id); };
  return {
    async flush(count = 4) {
      for (let frame = 0; frame < count; frame++) {
        const pending = [...callbacks.values()];
        callbacks.clear();
        for (const callback of pending) callback(performance.now());
        await Promise.resolve();
      }
    },
    restore() {
      globalThis.requestAnimationFrame = request;
      globalThis.cancelAnimationFrame = cancel;
      for (const callback of callbacks.values()) request(callback);
      callbacks.clear();
    },
  };
}

function nativeLayer() {
  const surface = document.createElement('div');
  surface.setAttribute('popover', 'manual');
  const action = document.createElement('button');
  action.textContent = 'Newer native layer';
  surface.append(action);
  document.body.append(surface);
  return {
    action,
    show() { surface.showPopover(); action.focus(); },
    hide() { surface.hidePopover(); },
    remove() { surface.hidePopover(); surface.remove(); },
  };
}

function escape(target) {
  const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
  target.dispatchEvent(event);
  return event;
}

export async function exerciseRuntimeSearchFocus() {
  const opener = document.querySelector('[data-open-search]');
  check(opener, 'Missing Search opener');
  const frames = holdFrames();
  const newer = nativeLayer();
  let box, getAnimations;
  try {
    opener.focus(); opener.click();
    box = document.querySelector('.site-search');
    const input = box?.querySelector('input');
    const results = [...(box?.querySelectorAll('a.search-result') ?? [])];
    check(box && input && results.length, 'Search did not mount');
    // Control completion independently of wall-clock animation duration.
    getAnimations = box.getAnimations;
    box.getAnimations = () => [];
    check(document.activeElement === input, 'Search did not focus before paint');
    const back = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true });
    input.dispatchEvent(back);
    check(back.defaultPrevented && document.activeElement === results.at(-1), 'Early Shift+Tab escaped Search');
    const forward = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    results.at(-1).dispatchEvent(forward);
    check(forward.defaultPrevented && document.activeElement === input, 'Early Tab escaped Search');
    results[0].focus();
    await frames.flush();
    check(document.activeElement === results[0], 'Search deferred focus replaced user focus');

    newer.show();
    await frames.flush();
    check(document.activeElement === newer.action, 'Search open stole newer native layer focus');
    check(!escape(newer.action).defaultPrevented && !box.classList.contains('is-closing') && !box.hidden, 'Search consumed a newer layer Escape');
    newer.hide(); input.focus();
    escape(input);
    newer.show();
    await frames.flush();
    check(box.hidden, 'Search close did not finish');
    check(document.activeElement === newer.action, 'Search close stole newer native layer focus');
    newer.hide();

    opener.focus(); opener.click();
    escape(input);
    opener.click();
    const reopenedResult = box.querySelector('a.search-result');
    reopenedResult.focus();
    await frames.flush();
    check(!box.hidden && document.activeElement === reopenedResult, 'Old Search close changed the reopened search');
    escape(reopenedResult);
    await frames.flush();
    check(box.hidden && document.activeElement === opener, 'Ordinary Search close did not restore its opener');
    return { immediateFocus: true, earlyTabWrap: true, deliberateFocusPreserved: true, newerLayerPreserved: true, reopenPreserved: true, openerRestored: true };
  } finally {
    if (box && getAnimations) box.getAnimations = getAnimations;
    newer.remove();
    frames.restore();
  }
}

export async function exerciseRuntimeSearchCloseGeneration() {
  check(!matchMedia('(prefers-reduced-motion: reduce)').matches, 'Animation generation check needs normal motion');
  const opener = document.querySelector('[data-open-search]');
  check(opener, 'Missing Search opener');
  const frames = holdFrames();
  const completions = [];
  let box, getAnimations;
  try {
    opener.focus(); opener.click();
    box = document.querySelector('.site-search');
    const input = box?.querySelector('input');
    check(box && input, 'Search did not mount');
    getAnimations = box.getAnimations;
    box.getAnimations = () => [{ finished: new Promise(resolve => completions.push(resolve)) }];
    escape(input);
    await frames.flush(1);
    opener.click();
    escape(input);
    await frames.flush(1);
    check(completions.length === 2, 'Both close cycles must wait for their own animation');
    completions[0]();
    await Promise.resolve(); await frames.flush();
    check(!box.hidden && box.classList.contains('is-closing'), 'Old animation completion finished a newer close');
    completions[1]();
    await Promise.resolve(); await frames.flush();
    check(box.hidden && document.activeElement === opener, 'Current animation completion failed to close and restore focus');
    return { staleAnimationIgnored: true, currentAnimationCompleted: true };
  } finally {
    if (box && getAnimations) box.getAnimations = getAnimations;
    for (const resolve of completions) resolve();
    frames.restore();
  }
}

export async function exerciseRuntimeAppearanceFocus() {
  const opener = document.querySelector('[data-samey-appearance]');
  check(opener, 'Missing Appearance opener');
  const frames = holdFrames();
  const newer = nativeLayer();
  const openAdvanced = () => { opener.focus(); opener.click(); document.querySelector('[data-open-advanced]').click(); };
  try {
    openAdvanced();
    const page = document.querySelector('.samey-theme-advanced');
    const close = page?.querySelector('[data-close-advanced]');
    check(page && close && document.activeElement === close, 'Advanced appearance did not focus before paint');
    const editor = page.querySelector('input');
    editor.focus();
    await frames.flush();
    check(document.activeElement === editor, 'Advanced appearance deferred focus replaced user focus');
    newer.show();
    await frames.flush();
    check(document.activeElement === newer.action, 'Advanced appearance open stole newer native layer focus');
    close.click();
    await frames.flush();
    check(page.hidden && document.activeElement === newer.action, 'Covered Advanced appearance close stole focus');
    newer.hide();

    openAdvanced(); close.click(); openAdvanced();
    editor.focus();
    await frames.flush();
    check(!page.hidden && document.activeElement === editor, 'Old Advanced appearance close stole reopened focus');
    close.click();
    newer.show();
    await frames.flush();
    check(document.activeElement === newer.action, 'Advanced appearance restore stole newer native layer focus');
    newer.hide();
    openAdvanced(); close.click();
    check(page.hidden && document.activeElement === opener, 'Advanced appearance did not restore its opener');

    opener.click();
    const panel = document.querySelector('.samey-theme-panel');
    const choice = panel.querySelector('button');
    choice.focus(); escape(choice);
    check(panel.hidden && document.activeElement === opener, 'Appearance Escape did not restore its opener');
    opener.click();
    const reopenedChoice = panel.querySelector('button');
    reopenedChoice.focus();
    await frames.flush();
    check(!panel.hidden && document.activeElement === reopenedChoice, 'Old Appearance Escape stole reopened focus');
    escape(reopenedChoice);
    newer.show();
    await frames.flush();
    check(document.activeElement === newer.action, 'Appearance Escape restore stole newer native layer focus');
    return { immediateFocus: true, deliberateFocusPreserved: true, newerLayerPreserved: true, reopenPreserved: true, openerRestored: true, appearanceEscapePreserved: true };
  } finally {
    newer.remove();
    frames.restore();
  }
}
