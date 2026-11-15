export type PreparedStyles = { desired: Set<string>; links: HTMLLinkElement[] };
type StyleAssets = Partial<Record<string, string[]>>;
type StyleLoad = { link: HTMLLinkElement; ready: Promise<void> };

/** Route styles can retire; scoped component styles stay owned by their cached modules. */
export function createStylesheetManager(ownerDocument: Document) {
  const loads = new Map<string, StyleLoad>();
  const managedLinks = () => [...ownerDocument.querySelectorAll<HTMLLinkElement>('link[data-samey-route-style][href]')];
  const load = (href: string, owner: string): StyleLoad => {
    const absolute = new URL(href, ownerDocument.baseURI).href;
    const cached = loads.get(absolute);
    if (cached?.link.isConnected) return cached;
    loads.delete(absolute);
    const existing = [...ownerDocument.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"][href]')].find(link => link.href === absolute);
    if (existing?.sheet) {
      existing.dataset.sameyRouteStyle = '';
      existing.dataset.sameyRouteOwner ??= owner;
      return { link: existing, ready: Promise.resolve() };
    }
    // Shell errors may precede initialization. Replacing an untracked pending
    // link guarantees readiness events and retains its original order/media.
    const link = existing ? existing.cloneNode() as HTMLLinkElement : ownerDocument.createElement('link');
    if (!existing) {
      link.rel = 'stylesheet';
      link.href = absolute;
      link.media = 'not all';
    }
    link.dataset.sameyRouteStyle = '';
    link.dataset.sameyRouteOwner ??= owner;
    const ready = new Promise<void>((resolve, reject) => {
      const cleanup = () => {
        link.removeEventListener('load', loaded);
        link.removeEventListener('error', failed);
      };
      const loaded = () => { cleanup(); resolve(); };
      const failed = () => {
        cleanup();
        if (loads.get(absolute)?.link === link) loads.delete(absolute);
        link.remove();
        reject(new Error(`Route stylesheet failed: ${absolute}`));
      };
      link.addEventListener('load', loaded, { once: true });
      link.addEventListener('error', failed, { once: true });
    });
    const task = { link, ready };
    loads.set(absolute, task);
    if (existing) existing.replaceWith(link);
    else ownerDocument.head.append(link);
    return task;
  };
  return {
    async prepare(hrefs: string[], owner: string): Promise<PreparedStyles> {
      const desired = new Set(hrefs.map(href => new URL(href, ownerDocument.baseURI).href));
      const tasks = [...desired].map(href => load(href, owner));
      await Promise.all(tasks.map(task => task.ready));
      return { desired, links: tasks.map(task => task.link) };
    },
    activateRoute(prepared: PreparedStyles) {
      for (const link of managedLinks()) {
        link.media = link.hasAttribute('data-samey-component-style') || prepared.desired.has(link.href) ? 'all' : 'not all';
      }
    },
    activateComponent(prepared: PreparedStyles, owner: string) {
      for (const link of prepared.links) {
        link.dataset.sameyComponentStyle = owner;
        link.media = 'all';
      }
    },
  };
}

let manager: ReturnType<typeof createStylesheetManager> | undefined;
let assetsTask: Promise<StyleAssets> | undefined;
const stylesheetManager = () => manager ??= createStylesheetManager(document);
export function preloadStyleManifest(): Promise<StyleAssets> {
  if (assetsTask) return assetsTask;
  if (typeof document === 'undefined') return Promise.resolve({});
  const source = document.querySelector<HTMLMetaElement>('meta[name="samey-route-assets"]')?.content;
  if (!source) return Promise.resolve({});
  assetsTask = fetch(new URL(source, location.href), { credentials: 'same-origin', cache: 'force-cache' })
    .then(async response => {
      if (!response.ok) throw new Error(`Route asset manifest failed: HTTP ${response.status}`);
      const value: unknown = await response.json();
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Route asset manifest is malformed');
      return value as StyleAssets;
    })
    .catch(error => { assetsTask = undefined; throw error; });
  return assetsTask;
}

export async function prepareStyles(group: string): Promise<PreparedStyles> {
  if (typeof document === 'undefined') return { desired: new Set(), links: [] };
  const assets = await preloadStyleManifest();
  return stylesheetManager().prepare(assets[group] ?? [], group);
}

export function activateRouteStyles(prepared: PreparedStyles) {
  if (typeof document !== 'undefined') stylesheetManager().activateRoute(prepared);
}

export async function loadComponentStyles(group: string): Promise<void> {
  const prepared = await prepareStyles(group);
  if (typeof document !== 'undefined') stylesheetManager().activateComponent(prepared, group);
}
