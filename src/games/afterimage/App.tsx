import { Errored, For, Loading, Show, createSignal, lazy, onCleanup, onSettled } from 'solid-js';
import { Dynamic } from '@solidjs/web';
import { Button } from '../../shared/components/Button.tsx';
import { TopBar, TopBarIconButton } from '../../shared/components/TopBar.tsx';
import { SmartLink } from '../../shared/components/NavLink.tsx';
import { ArrowUpRight, ChevronLeft, Download, Redo2, Upload, X } from '../../shared/components/Icons.tsx';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../../shared/components/Dialog.tsx';
import { History } from './History.tsx';
import { installInputTracking, isRestartBlocked, setRestartBlocked, useRestartBlocked } from './common.tsx';
import { installRipple } from './ripple.ts';
import { exportHistory, importHistory, saveResult } from './history.ts';
import { createAfterimageNavigation, type AfterimageRoute } from './navigation.ts';
import type { GameId, GameResult } from './types.ts';

const MemoryGame = lazy(() => import('./Memory.tsx'), { export: 'MemoryGame' });
const PairGame = lazy(() => import('./Pair.tsx'), { export: 'PairGame' });
const WordsGame = lazy(() => import('./Words.tsx'), { export: 'WordsGame' });
const SpeedGame = lazy(() => import('./Speed.tsx'), { export: 'SpeedGame' });
const ThinkingGame = lazy(() => import('./Thinking.tsx'), { export: 'ThinkingGame' });

type Entry = { id: GameId; title: string; category: string; art: string };
export const games: Entry[] = [
  { id: 'visual', title: 'Pattern memory', category: 'Memory', art: 'visual' },
  { id: 'sequence', title: 'Sequence memory', category: 'Memory', art: 'sequence' },
  { id: 'sequence-fresh', title: 'Sequence memory', category: 'Memory', art: 'sequence-fresh' },
  { id: 'number', title: 'Number memory', category: 'Memory', art: 'number' },
  { id: 'verbal', title: 'Verbal memory', category: 'Memory', art: 'verbal' },
  { id: 'chimp', title: 'Order memory', category: 'Memory', art: 'chimp' },
  { id: 'reverse', title: 'Reverse span', category: 'Memory', art: 'reverse' },
  { id: 'reverse-fresh', title: 'Reverse span', category: 'Memory', art: 'reverse-fresh' },
  { id: 'pairs', title: 'Pair memory', category: 'Memory', art: 'pairs' },
  { id: 'reaction', title: 'Reaction time', category: 'Speed', art: 'reaction' },
  { id: 'aim', title: 'Aim training', category: 'Speed', art: 'aim' },
  { id: 'typing', title: 'Typing speed', category: 'Speed', art: 'typing' },
  { id: 'cps', title: 'Click / tap speed', category: 'Speed', art: 'cps' },
  { id: 'number-order', title: 'Number order', category: 'Speed', art: 'order' },
  { id: 'stroop', title: 'Colour words', category: 'Focus', art: 'stroop' },
  { id: 'arithmetic', title: 'Mental arithmetic', category: 'Focus', art: 'math' },
  { id: 'rotation', title: 'Mental rotation', category: 'Spatial', art: 'rotation' },
  { id: 'patterns', title: 'Number patterns', category: 'Reasoning', art: 'patterns' },
  { id: 'search', title: 'Visual search', category: 'Perception', art: 'search' },
];
const artwork = import.meta.glob<string>('./assets/*.svg', { eager: true, query: '?url', import: 'default' });
function component(id: GameId) {
  if (id === 'pairs') return PairGame;
  if (['number', 'verbal', 'typing'].includes(id)) return WordsGame;
  if (['reaction', 'aim', 'cps'].includes(id)) return SpeedGame;
  if (['stroop', 'arithmetic', 'rotation', 'patterns', 'search'].includes(id)) return ThinkingGame;
  return MemoryGame;
}
type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

export function App() {
  onCleanup(installInputTracking());
  onCleanup(installRipple());
  const navigation = createAfterimageNavigation(history, { getItem: key => sessionStorage.getItem(key), setItem: (key, value) => sessionStorage.setItem(key, value) }, games.map(game => game.id));
  const restored = navigation.current();
  const [selection, setSelection] = createSignal<{ id: GameId; generation: number } | null>(restored.game ? { id: restored.game, generation: 0 } : null);
  const [revision, setRevision] = createSignal(0);
  const [latest, setLatest] = createSignal<GameResult | null>(null);
  const [activeScope, setActiveScope] = createSignal<string>();
  const restartBlocked = useRestartBlocked();
  const [message, setMessage] = createSignal('');
  const [transfer, setTransfer] = createSignal(false);
  const [install, setInstall] = createSignal<InstallPrompt | null>(null);
  const [update, setUpdate] = createSignal(false);
  const [offline, setOffline] = createSignal(!navigator.onLine);
  let generation = 0;
  let frame = 0;
  const resultRestartGuard = {};
  let resultRestartTimer = 0;
  let upload!: HTMLInputElement;
  let transferOpener!: HTMLButtonElement;
  const current = () => games.find(game => game.id === selection()?.id);
  function afterPaint(fn: () => void) { cancelAnimationFrame(frame); frame = requestAnimationFrame(fn); }
  function clearResultRestartGuard() { window.clearTimeout(resultRestartTimer); setRestartBlocked(resultRestartGuard, false); }
  function applyRoute(route: AfterimageRoute) {
    clearResultRestartGuard();
    setSelection(route.game ? { id: route.game, generation: ++generation } : null); setLatest(null); setActiveScope(undefined);
    afterPaint(() => {
      window.scrollTo({ top: route.game ? 0 : route.homeScroll, behavior: 'instant' });
      document.querySelector<HTMLElement>(route.game ? '.ai-play h1' : `[data-game-card="${route.selectedCard}"]`)?.focus({ preventScroll: true });
    });
  }
  function open(id: GameId) { applyRoute(navigation.open(id, Math.max(0, window.scrollY))); }
  function back() {
    if (!navigation.current().game && !navigation.canGoBack()) { location.assign('/'); return; }
    const fallback = navigation.back();
    if (fallback) applyRoute(fallback);
  }
  function finish(result: GameResult) {
    // Block synchronously while the result component and its carried-input gate are still being committed.
    window.clearTimeout(resultRestartTimer); setRestartBlocked(resultRestartGuard, true);
    resultRestartTimer = window.setTimeout(clearResultRestartGuard, 750);
    setLatest(result);
    setActiveScope(result.scope);
    try { saveResult(result); setMessage(''); }
    catch { setMessage('This score could not be saved. Check browser storage, then export your history before making changes.'); }
    setRevision(value => value + 1);
  }
  function download() {
    try {
      const blob = new Blob([exportHistory()], { type: 'application/json' }), url = URL.createObjectURL(blob);
      const link = document.createElement('a'); link.href = url; link.download = `afterimage-history-${new Date().toISOString().slice(0, 10)}.json`; link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000); setMessage('History exported.');
    } catch { setMessage('History could not be exported. Browser storage may be unavailable.'); }
  }
  async function uploadHistory(file?: File) {
    if (!file) return;
    try { if (file.size > 20 * 1024 * 1024) throw new Error('Choose a history file smaller than 20 MB.'); const count = importHistory(await file.text()); setRevision(value => value + 1); setMessage(`Imported ${count} ${count === 1 ? 'run' : 'runs'}. Existing results were kept.`); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'History could not be imported.'); }
    upload.value = '';
  }
  onSettled(() => {
    const originalRestoration = history.scrollRestoration; history.scrollRestoration = 'manual';
    const scroll = () => navigation.recordScroll(Math.max(0, window.scrollY));
    const popstate = (event: PopStateEvent) => applyRoute(navigation.restore(event.state));
    const connection = () => setOffline(!navigator.onLine);
    const prompt = (event: Event) => { event.preventDefault(); setInstall(event as InstallPrompt); };
    const installed = () => setInstall(null);
    let controlled = !!navigator.serviceWorker?.controller;
    const controller = () => { if (controlled) setUpdate(true); controlled = true; };
    window.addEventListener('scroll', scroll, { passive: true }); window.addEventListener('pagehide', scroll); window.addEventListener('popstate', popstate);
    window.addEventListener('online', connection); window.addEventListener('offline', connection);
    window.addEventListener('beforeinstallprompt', prompt); window.addEventListener('appinstalled', installed);
    navigator.serviceWorker?.addEventListener('controllerchange', controller);
    afterPaint(() => window.scrollTo({ top: restored.game ? 0 : restored.homeScroll, behavior: 'instant' }));
    return () => { history.scrollRestoration = originalRestoration; window.removeEventListener('scroll', scroll); window.removeEventListener('pagehide', scroll); window.removeEventListener('popstate', popstate); window.removeEventListener('online', connection); window.removeEventListener('offline', connection); window.removeEventListener('beforeinstallprompt', prompt); window.removeEventListener('appinstalled', installed); navigator.serviceWorker?.removeEventListener('controllerchange', controller); };
  });
  onCleanup(() => cancelAnimationFrame(frame));
  onCleanup(clearResultRestartGuard);
  return <div class="afterimage-app">
    <TopBar start={<div class="ai-topbar-start"><TopBarIconButton class="ai-back" label="Back" onClick={back}><ChevronLeft size={18}/></TopBarIconButton><SmartLink href="/afterimage/" class="ai-wordmark" title="Afterimage games" onClick={event => { if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); if (navigation.current().game) applyRoute(navigation.home()); }}>Afterimage</SmartLink></div>} actions={<><Show when={selection()}><Button class="ai-restart" aria-label="Restart" title="Restart" disabled={restartBlocked()} onClick={() => { if (!isRestartBlocked()) applyRoute(navigation.current()); }} onKeyDown={event => { if (event.repeat && ['Enter', ' '].includes(event.key)) event.preventDefault(); }}><Redo2 size={16}/><span class="ai-restart-label">Restart</span></Button></Show><Show when={install() && !selection()}><TopBarIconButton label="Install Afterimage" onClick={() => { const deferred = install(); if (deferred) void deferred.prompt().then(() => { setInstall(null); }); }}><Download size={18}/></TopBarIconButton></Show><TopBarIconButton ref={element => { transferOpener = element; }} label="Import or export history" onClick={() => setTransfer(true)}><Upload size={18}/></TopBarIconButton></>}/>
    <Show when={offline()}><p class="ai-banner" role="status">Offline · scores stay on this device</p></Show>
    <Show when={update() && !selection()}><div class="ai-banner">An update is ready.<Button onClick={() => location.reload()}>Reload</Button><Button aria-label="Dismiss update" onClick={() => setUpdate(false)}><X size={16}/></Button></div></Show>
    <main class={['ai-main', selection() ? 'ai-play' : 'ai-library']} data-category={current()?.category}>
      <Show when={selection()} keyed fallback={<><div class="ai-library-heading"><h1>Games</h1><span>19 games</span></div><For each={['Memory', 'Speed', 'Focus', 'Spatial', 'Reasoning', 'Perception']}>{category => <section class="ai-category" data-category={category}><h2>{category}</h2><div class="ai-game-library"><For each={games.filter(game => game.category === category)}>{game => <button type="button" class="ai-game-card" data-game-card={game.id} onPointerEnter={() => { void component(game.id).preload().catch(() => {}); }} onFocus={() => { void component(game.id).preload().catch(() => {}); }} onClick={() => open(game.id)}><span class="ai-game-art"><img src={artwork[`./assets/${game.art}.svg`]} alt="" width="88" height="68"/></span><span class="ai-game-name"><span>{game.title}</span><Show when={game.id.endsWith('-fresh')}><span class="ai-hard">Hard</span></Show></span><ArrowUpRight class="ai-card-arrow" size={18}/></button>}</For></div></section>}</For></>}>
        {selected => <><header class="ai-play-heading"><h1 tabindex="-1">{current()?.title}</h1><Show when={selected.id.endsWith('-fresh')}><span class="ai-hard">Hard</span></Show></header><section class="ai-game" data-game={selected.id}><Errored fallback={(_error, reset) => <div class="ai-load-error" role="alert"><p>This game could not be loaded.</p><Button onClick={reset}>Try again</Button></div>}><Loading fallback={<p class="ai-loading" role="status">Loading game…</p>}><Dynamic component={component(selected.id)} id={selected.id} onFinish={finish} onScopeChange={setActiveScope}/></Loading></Errored></section><History id={selected.id} revision={revision()} latestScope={activeScope() ?? latest()?.scope}/></>}
      </Show>
    </main>
    <Show when={message()}><p class="ai-storage-message" role="status">{message()}</p></Show>
    <Dialog open={transfer()} onOpenChange={setTransfer}><DialogContent class="ai-transfer" onCloseAutoFocus={event => { event.preventDefault(); transferOpener.focus({ preventScroll: true }); }}><div class="ai-dialog-heading"><DialogTitle>Keep your history</DialogTitle><Button aria-label="Close history transfer" onClick={() => setTransfer(false)}><X size={18}/></Button></div><DialogDescription>Scores are saved in this browser, separately for each input method and rules version.</DialogDescription><p>Export a backup or import an Afterimage history file from another device. Imports merge with your existing runs.</p><p>Browser storage cannot be read across different website addresses. Scores from the previous standalone app must be exported from that original address first.</p><div class="ai-actions"><Button onClick={download}><Download size={18}/>Export history</Button><Button onClick={() => upload.click()}><Upload size={18}/>Import history</Button></div><input ref={upload} type="file" tabindex={-1} accept="application/json,.json" hidden onChange={event => { void uploadHistory(event.currentTarget.files?.[0]); }}/><Show when={message()}><p role="status">{message()}</p></Show></DialogContent></Dialog>
  </div>;
}
