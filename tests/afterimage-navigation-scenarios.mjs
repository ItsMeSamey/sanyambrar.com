// Shared by compiled-DOM and original-profile browser QA runners; no app internals are mocked.
export async function exerciseNavigationWordmark() {
  const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
  const check = (value, message) => { if (!value) throw new Error(`Afterimage navigation: ${message}`); };
  const wait = async (read, label) => {
    const end = performance.now() + 8000;
    while (performance.now() < end) { if (read()) return; await pause(10); }
    throw new Error(`Afterimage navigation: timed out waiting for ${label}`);
  };
  const wordmark = () => document.querySelector('.ai-wordmark');
  const library = () => document.querySelector('[data-game-card="visual"]');
  check(wordmark(), 'wordmark is missing');
  if (!library()) {
    wordmark().click();
    await wait(library, 'library');
  }
  const primary = () => {
    const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
    wordmark().dispatchEvent(event);
    check(event.defaultPrevented, 'ordinary wordmark click must cancel document navigation');
  };
  const libraryLength = history.length;
  primary();
  await pause(30);
  check(library(), 'library wordmark click must keep the library mounted');
  check(history.length === libraryLength, 'library wordmark click added a redundant history entry');

  library().click();
  await wait(() => document.querySelector('[data-game="visual"]'), 'game');
  const gameLength = history.length;
  primary();
  await wait(library, 'library after game');
  check(history.length === gameLength + 1, 'game wordmark click must add exactly one library entry');
  primary();
  check(history.length === gameLength + 1, 'repeated library wordmark click added history');

  const modifiedLength = history.length;
  for (const options of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }]) {
    let appCanceled;
    // Observe after Solid's document listener, then suppress the browser default so QA opens no tabs.
    const stopDefault = event => { appCanceled = event.defaultPrevented; event.preventDefault(); };
    window.addEventListener('click', stopDefault, { once: true });
    try { wordmark().dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ...options })); }
    finally { window.removeEventListener('click', stopDefault); }
    check(appCanceled === false, `modified wordmark click was intercepted: ${JSON.stringify(options)}`);
    check(library(), 'modified wordmark click changed the rendered route');
    check(history.length === modifiedLength, 'modified wordmark click changed app history');
  }
  return { primaryClicks: 3, modifiedClicks: 5, addedLibraryEntries: 1 };
}
