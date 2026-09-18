const STALE_IMPORT_RELOAD_KEY = 'samey.stale-import-reload.v1';
const STALE_IMPORT_RELOAD_WINDOW_MS = 15_000;

function errorText(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  return String(error ?? '');
}

function isDynamicImportFetchFailure(error: unknown): boolean {
  const message = errorText(error);
  return /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Failed to load module script/i.test(message);
}

function reloadForStaleImport(): boolean {
  if (typeof location === 'undefined' || typeof sessionStorage === 'undefined') return false;
  const now = Date.now();
  let previous = 0;
  try { previous = Number(sessionStorage.getItem(STALE_IMPORT_RELOAD_KEY) || 0); }
  catch (error) { console.warn('Could not read stale-import reload marker', error); }
  if (Number.isFinite(previous) && now - previous < STALE_IMPORT_RELOAD_WINDOW_MS) return false;
  try { sessionStorage.setItem(STALE_IMPORT_RELOAD_KEY, String(now)); }
  catch (error) { console.warn('Could not persist stale-import reload marker', error); }
  location.reload();
  return true;
}

export function resilientImport<T>(load: () => Promise<T>): Promise<T> {
  return load().catch(error => {
    if (isDynamicImportFetchFailure(error) && reloadForStaleImport()) {
      // Keep the current lazy boundary pending while the browser navigates to the
      // fresh shell. Rejecting here would briefly render the fatal error screen.
      return new Promise<T>(() => {});
    }
    throw error;
  });
}
