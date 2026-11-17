// Reused by native-browser regression tests and the compiled Solid DOM fixture.
export async function exerciseDialogFocusBeforePaint() {
  const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
  const check = (value, message) => { if (!value) throw new Error(message); };
  const opener = document.querySelector('[aria-label="Import or export history"]');
  check(opener, 'Missing history transfer opener');
  opener.focus();

  // A background window may not paint for a long time. Hold only animation
  // frames so Solid effects and real input can still initialize the dialog.
  const originalRequest = globalThis.requestAnimationFrame;
  const originalCancel = globalThis.cancelAnimationFrame;
  const callbacks = new Map();
  let nextId = -1;
  globalThis.requestAnimationFrame = callback => { const id = nextId--; callbacks.set(id, callback); return id; };
  globalThis.cancelAnimationFrame = id => { if (!callbacks.delete(id)) originalCancel(id); };
  const resume = () => {
    globalThis.requestAnimationFrame = originalRequest;
    globalThis.cancelAnimationFrame = originalCancel;
    for (const callback of callbacks.values()) originalRequest(callback);
    callbacks.clear();
  };
  try {
    opener.click();
    await pause(30);
    const dialog = document.querySelector('.ai-transfer[role="dialog"]');
    const close = dialog?.querySelector('[aria-label="Close history transfer"]');
    const buttons = [...(dialog?.querySelectorAll('button') ?? [])];
    const last = buttons.at(-1);
    const exportButton = buttons.find(button => button.textContent.includes('Export history'));
    check(dialog && close && last && exportButton, 'History transfer did not mount before paint');
    check(document.activeElement === close, 'Dialog did not receive focus before its first animation frame');
    const back = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true });
    close.dispatchEvent(back);
    check(back.defaultPrevented && document.activeElement === last, 'Shift+Tab escaped before paint');
    const forward = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    last.dispatchEvent(forward);
    check(forward.defaultPrevented && document.activeElement === close, 'Tab escaped before paint');
    exportButton.focus();
    resume();
    await new Promise(resolve => originalRequest(() => originalRequest(() => originalRequest(resolve))));
    check(document.activeElement === exportButton, 'Deferred autofocus stole focus after paint resumed');
    close.click();
    await pause(40);
    check(!document.querySelector('.ai-transfer[role="dialog"]'), 'Dialog did not close');
    check(document.activeElement === opener, 'Dialog did not restore its opener');
    return { immediateFocus: true, earlyTabWrap: true, lateFocusPreserved: true, openerRestored: true };
  } finally {
    resume();
  }
}

export async function exerciseDialogRestoreOwnership() {
  const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
  const check = (value, message) => { if (!value) throw new Error(message); };
  const opener = document.querySelector('[aria-label="Import or export history"]');
  const close = () => document.querySelector('[aria-label="Close history transfer"]');
  const originalRequest = globalThis.requestAnimationFrame;
  const originalCancel = globalThis.cancelAnimationFrame;
  const callbacks = new Map();
  let nextId = -1;
  let newerLayer;
  globalThis.requestAnimationFrame = callback => { const id = nextId--; callbacks.set(id, callback); return id; };
  globalThis.cancelAnimationFrame = id => { if (!callbacks.delete(id)) originalCancel(id); };
  const flush = async () => {
    for (let frame = 0; frame < 8; frame++) {
      const pending = [...callbacks.values()];
      callbacks.clear();
      for (const callback of pending) callback(performance.now());
      await pause(10);
    }
  };
  try {
    check(opener, 'Missing history transfer opener');
    opener.focus(); opener.click(); await pause(30);
    check(close(), 'First transfer did not open');
    close().click(); await pause(30);
    opener.click(); await pause(30);
    const dialog = document.querySelector('.ai-transfer');
    const target = [...(dialog?.querySelectorAll('button') ?? [])].find(button => button.textContent.includes('Export history'));
    check(target, 'Transfer did not reopen');
    target.focus();
    await flush();
    check(document.activeElement === target, 'Old close callback stole focus from the reopened dialog');

    close().click(); await pause(30);
    newerLayer = document.createElement('div');
    newerLayer.setAttribute('popover', 'manual');
    const action = document.createElement('button');
    action.textContent = 'Newer layer action';
    newerLayer.append(action); document.body.append(newerLayer);
    newerLayer.showPopover(); action.focus();
    await flush();
    check(document.activeElement === action, 'Old close callback stole focus from a newer native layer');
    newerLayer.hidePopover(); newerLayer.remove(); newerLayer = undefined;

    opener.focus(); opener.click(); await pause(30);
    close().click(); await pause(30);
    await flush();
    check(document.activeElement === opener, 'Ordinary close stopped restoring its opener');
    return { reopenedFocusPreserved: true, newerLayerFocusPreserved: true, ordinaryRestorePreserved: true };
  } finally {
    newerLayer?.hidePopover(); newerLayer?.remove();
    globalThis.requestAnimationFrame = originalRequest;
    globalThis.cancelAnimationFrame = originalCancel;
    for (const callback of callbacks.values()) originalRequest(callback);
  }
}
