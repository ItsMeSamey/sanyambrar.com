import { Errored, For, Loading, Show, createSignal, lazy, onCleanup, onSettled } from 'solid-js';
import { Dynamic } from '@solidjs/web';
import { Button } from '../../shared/components/Button.tsx';
import { TopBar, TopBarIconButton } from '../../shared/components/TopBar.tsx';
import { HomeBrand } from '../../shared/components/Brand.tsx';
import { SmartLink } from '../../shared/components/NavLink.tsx';
import { ArrowUpRight, ChevronLeft, Download, RotateCw, Upload, X } from '../../shared/components/Icons.tsx';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../../shared/components/Dialog.tsx';
import { History } from './History.tsx';
import { installInputTracking, isRestartBlocked, setRestartBlocked, useRestartBlocked } from './common.tsx';
import { installRipple } from './ripple.ts';
import { installAfterimageFavicon } from './favicon.ts';
import { exportHistory, importHistory, saveResult } from './history.ts';
import { createAfterimageNavigation, type AfterimageRoute } from './navigation.ts';
import { isHardGame, type GameId, type GameResult } from './types.ts';

const MemoryGame = lazy(() => import('./Memory.tsx'), { export: 'MemoryGame' });
const PairGame = lazy(() => import('./Pair.tsx'), { export: 'PairGame' });
const WordsGame = lazy(() => import('./Words.tsx'), { export: 'WordsGame' });
const SpeedGame = lazy(() => import('./Speed.tsx'), { export: 'SpeedGame' });
const ThinkingGame = lazy(() => import('./Thinking.tsx'), { export: 'ThinkingGame' });
const PaperFoldingGame = lazy(() => import('./PaperFolding.tsx'));
const DeductionGame = lazy(() => import('./Deduction.tsx'), { export: 'DeductionGame' });
const ColourMatchGame = lazy(() => import('./ColourMatch.tsx'));
const RhythmGame = lazy(() => import('./Rhythm.tsx'), { export: 'RhythmGame' });
const TrackingGame = lazy(() => import('./Tracking.tsx'), { export: 'TrackingGame' });

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
  { id: 'rhythm', title: 'Rhythm memory', category: 'Memory', art: 'rhythm' },
  { id: 'reaction', title: 'Reaction time', category: 'Speed', art: 'reaction' },
  { id: 'aim', title: 'Aim training', category: 'Speed', art: 'aim' },
  { id: 'cps', title: 'Click / tap speed', category: 'Speed', art: 'cps' },
  { id: 'number-order', title: 'Number order', category: 'Speed', art: 'order' },
  { id: 'stroop', title: 'Colour words', category: 'Focus', art: 'stroop' },
  { id: 'arithmetic', title: 'Mental arithmetic', category: 'Focus', art: 'math' },
  { id: 'tracking', title: 'Object tracking', category: 'Focus', art: 'tracking' },
  { id: 'tracking-hard', title: 'Object tracking', category: 'Focus', art: 'tracking' },
  { id: 'rotation', title: 'Mental rotation', category: 'Spatial', art: 'rotation' },
  { id: 'paper-folding', title: 'Paper folding', category: 'Spatial', art: 'paper-folding' },
  { id: 'patterns', title: 'Number patterns', category: 'Reasoning', art: 'patterns' },
  { id: 'deduction', title: 'Deduction', category: 'Reasoning', art: 'deduction' },
  { id: 'search', title: 'Visual search', category: 'Perception', art: 'search' },
  { id: 'colour-match', title: 'Colour match', category: 'Perception', art: 'colour-match' },
];
const sourceArtwork = import.meta.glob<string>(['./assets/*.svg', '!./assets/typing.svg'], { eager: true, query: '?raw', import: 'default' });
// Keep the original drawings, but let their ink and cutouts follow the selected theme.
const artwork = Object.fromEntries(Object.entries(sourceArtwork).map(([path, svg]) => [path, svg.replace(/#[0-9a-f]{6}/gi, color => {
  const channels = [1, 3, 5].map(offset => Number.parseInt(color.slice(offset, offset + 2), 16));
  const brightness = (channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722) / 255;
  return brightness < .15 ? 'var(--site-accent-on-fg)' : brightness < .33 ? 'var(--ai-art-muted)' : brightness < .7 ? 'var(--ai-accent)' : 'var(--site-fg)';
})]));
function AfterimageLogo() {
  return <svg class="ai-library-logo" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M12 3v18M3 12h9"/><path d="M12 3h5a4 4 0 0 1 4 4v5h-9Z" fill="currentColor" stroke="none"/></svg>;
}
function component(id: GameId) {
  if (id === 'rhythm') return RhythmGame;
  if (id === 'tracking' || id === 'tracking-hard') return TrackingGame;
  if (id === 'paper-folding') return PaperFoldingGame;
  if (id === 'deduction') return DeductionGame;
  if (id === 'colour-match') return ColourMatchGame;
  if (id === 'pairs') return PairGame;
  if (['number', 'verbal'].includes(id)) return WordsGame;
  if (['reaction', 'aim', 'cps'].includes(id)) return SpeedGame;
  if (['stroop', 'arithmetic', 'rotation', 'patterns', 'search'].includes(id)) return ThinkingGame;
  return MemoryGame;
}
type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

export function App() {
  onCleanup(installInputTracking());
  onCleanup(installRipple());
  onSettled(installAfterimageFavicon);
  const navigation = createAfterimageNavigation(history, { getItem: key => sessionStorage.getItem(key), setItem: (key, value) => sessionStorage.setItem(key, value) }, games.map(game => game.id));
  const restored = navigation.current();
  const [selection, setSelection] = createSignal<{ id: GameId; generation: number } | null>(restored.game ? { id: restored.game, generation: 0 } : null);
  const [revision, setRevision] = createSignal(0);
  const [latest, setLatest] = createSignal<GameResult | null>(null);
  const [activeScope, setActiveScope] = createSignal<string>();
  const [hasActivity, setHasActivity] = createSignal(false);
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
    window.dispatchEvent(new Event('samey-navigationstart'));
    const nextGeneration = ++generation;
    clearResultRestartGuard();
    setHasActivity(false);
    setTransfer(false);
    setSelection(route.game ? { id: route.game, generation: nextGeneration } : null); setLatest(null); setActiveScope(undefined);
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
    setHasActivity(true);
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
    <TopBar start={<Show when={selection()} fallback={<HomeBrand class="brand home-brand-link"/>}>
      <div class="ai-topbar-start"><TopBarIconButton class="ai-back" label="Back" onClick={back}><ChevronLeft size={18}/></TopBarIconButton><SmartLink href="/afterimage/" class="ai-wordmark" title="Afterimage games" onClick={event => { if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); applyRoute(navigation.home()); }}>Afterimage</SmartLink></div>
    </Show>} actions={<>
      <Show when={selection() && hasActivity()}><Button class="ai-restart" aria-label="Restart" title="Restart" disabled={restartBlocked()} onClick={() => { if (!isRestartBlocked()) applyRoute(navigation.current()); }} onKeyDown={event => { if (event.repeat && ['Enter', ' '].includes(event.key)) event.preventDefault(); }}><RotateCw size={18}/></Button></Show>
      <Show when={!selection()}><Show when={install()}><TopBarIconButton label="Install Afterimage" onClick={() => { const deferred = install(); if (deferred) void deferred.prompt().then(() => { setInstall(null); }); }}><Download size={18}/></TopBarIconButton></Show><TopBarIconButton ref={element => { transferOpener = element; }} label="Import or export history" onClick={() => setTransfer(true)}><Upload size={18}/></TopBarIconButton></Show>
    </>}/>
    <Show when={offline()}><p class="ai-banner" role="status">Offline · scores stay on this device</p></Show>
    <Show when={update() && !selection()}><div class="ai-banner">An update is ready.<Button onClick={() => location.reload()}>Reload</Button><Button aria-label="Dismiss update" onClick={() => setUpdate(false)}><X size={16}/></Button></div></Show>
    <main class={['ai-main', selection() ? 'ai-play' : 'ai-library']} data-category={current()?.category}>
      <Show when={selection()} keyed fallback={<>
        <div class="ai-library-heading"><h1><SmartLink href="/afterimage/" class="ai-wordmark ai-library-brand" onClick={event => { if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); }}><AfterimageLogo/><span>Afterimage</span></SmartLink></h1><span>{games.length} games</span></div>
        <For each={['Memory', 'Speed', 'Focus', 'Spatial', 'Reasoning', 'Perception']}>{category => <section class="ai-category" data-category={category}><h2>{category}</h2><div class="ai-game-library"><For each={games.filter(game => game.category === category)}>{game => <button type="button" class="ai-game-card" data-game-card={game.id} data-hard={isHardGame(game.id) ? "true" : undefined} onPointerEnter={() => { void component(game.id).preload().catch(() => {}); }} onFocus={() => { void component(game.id).preload().catch(() => {}); }} onClick={() => open(game.id)}><span class="ai-game-art" aria-hidden="true" innerHTML={artwork[`./assets/${game.art}.svg`]}/><span class="ai-game-name">{game.title}</span><span class="ai-card-corner"><Show when={isHardGame(game.id)}><span class="ai-hard">Hard</span></Show><ArrowUpRight class="ai-card-arrow" size={16}/></span></button>}</For></div></section>}</For>
      </>}>
        {selected => <><header class="ai-play-heading"><h1 tabindex="-1">{current()?.title}</h1><Show when={isHardGame(selected.id)}><span class="ai-hard">Hard</span></Show></header><section class="ai-game" data-game={selected.id}><Errored fallback={(_error, reset) => <div class="ai-load-error" role="alert"><p>This game could not be loaded.</p><Button onClick={reset}>Try again</Button></div>}><Loading fallback={<p class="ai-loading" role="status">Loading game…</p>}><Dynamic component={component(selected.id)} id={selected.id} onFinish={(result: GameResult) => { if (selected.generation === generation) finish(result); }} onScopeChange={(scope: string) => { if (selected.generation === generation) setActiveScope(scope); }} onActivityChange={(active: boolean) => { if (selected.generation === generation) setHasActivity(active); }}/></Loading></Errored></section><History id={selected.id} revision={revision()} latestScope={activeScope() ?? latest()?.scope}/></>}
      </Show>
    </main>
    <Show when={message()}><p class="ai-storage-message" role="status">{message()}</p></Show>
    <Dialog open={transfer()} onOpenChange={setTransfer}><DialogContent class="ai-transfer" onCloseAutoFocus={event => { event.preventDefault(); if (transferOpener?.isConnected) transferOpener.focus({ preventScroll: true }); }}><div class="ai-dialog-heading"><DialogTitle>Keep your history</DialogTitle><Button aria-label="Close history transfer" onClick={() => setTransfer(false)}><X size={18}/></Button></div><DialogDescription>Scores are saved in this browser, separately for each input method and rules version.</DialogDescription><p>Export a backup or import an Afterimage history file from another device. Imports merge with your existing runs.</p><p>Browser storage cannot be read across different website addresses. Scores from the previous standalone app must be exported from that original address first.</p><div class="ai-actions"><Button onClick={download}><Download size={18}/>Export history</Button><Button onClick={() => upload.click()}><Upload size={18}/>Import history</Button></div><input ref={upload} type="file" tabindex={-1} accept="application/json,.json" hidden onChange={event => { void uploadHistory(event.currentTarget.files?.[0]); }}/><Show when={message()}><p role="status">{message()}</p></Show></DialogContent></Dialog>
  </div>;
}
