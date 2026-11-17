import type { GameId, GameResult } from './types.ts';

export type HistoryRow = { value: number; date: number; scoreMode?: string; unit?: string; lowerIsBetter?: boolean; [key: string]: unknown };
const aliases: Record<string, string> = { typing: 'typing-v2-60s', stroop: 'stroop-v2-30s', 'sequence-v2-growing': 'sequence', 'reverse-v2-fresh': 'reverse' };
export const scoreKey = (scope: string) => `afterimage-history-${aliases[scope] ?? scope}`;
export const baseGame = (id: GameId) => id === 'number-order' ? 'order' : id === 'arithmetic' ? 'math' : id.replace('-fresh', '');
export function initialScope(id: GameId): string {
  const scopes: Record<GameId, string> = { visual: 'visual-v3-standard', sequence: 'sequence-v3-growing', 'sequence-fresh': 'sequence-v2-fresh', reverse: 'reverse-v2-growing', 'reverse-fresh': 'reverse-v2-fresh', number: 'number-v2-hb', verbal: 'verbal-v5-progressive', chimp: 'chimp-v3-compact-mouse', pairs: 'pairs-v4-mouse', reaction: 'reaction-v7-desktop', aim: 'aim-v4-compact-mouse', typing: 'typing-v4-hardware-passage', cps: 'cps-v1-mouse-10s', 'number-order': 'order-v2-mouse', stroop: 'stroop', arithmetic: 'math', rotation: 'rotation-v4-60s', patterns: 'patterns-v4-60s', search: 'search-v2-30s', 'paper-folding': 'paper-folding-v2-60s', deduction: 'deduction-v3-letters-60s', 'colour-match': 'colour-match-v2-60s', rhythm: 'rhythm-v1-mouse', tracking: 'tracking-v1', 'tracking-hard': 'tracking-hard-v1' };
  return scopes[id];
}
export function isCurrentScope(id: GameId, scope: string): boolean {
  if (id === 'rhythm') return /^rhythm-v1-(mouse|touch|pen|keyboard)$/.test(scope);
  if (id === 'tracking' || id === 'tracking-hard') return scope === initialScope(id);
  if (id === 'deduction' && /^deduction-v3-(letters|images)-60s$/.test(scope)) return true;
  return scope === initialScope(id) || /^(aim-v[46]-(standard|compact)-(mouse|pen)|aim-v6-(standard|compact)-(touch|keyboard)|chimp-v3-(standard|compact)-(mouse|touch|pen|keyboard)|pairs-v4-(mouse|touch|pen|keyboard)|order-v2-(mouse|touch|pen|keyboard)|reaction-v7-(desktop|touch-release|pen)|typing-v4-(hardware|onscreen)-passage|cps-v1-mouse-10s|tps-v3-touch-10s|sequence-v3-growing|sequence-v2-fresh|reverse-v2-(growing|fresh))$/.test(scope);
}
export function readHistory(scope: string): HistoryRow[] {
  const parsed: unknown = JSON.parse(localStorage.getItem(scoreKey(scope)) ?? '[]');
  if (!Array.isArray(parsed)) throw new Error('Saved scores are not a valid history.');
  return parsed.filter((row: unknown): row is HistoryRow => !!row && typeof row === 'object' && 'value' in row && typeof row.value === 'number' && Number.isFinite(row.value));
}
export function saveResult(result: GameResult) {
  const rows: unknown = JSON.parse(localStorage.getItem(scoreKey(result.scope)) ?? '[]');
  if (!Array.isArray(rows)) throw new Error('Saved scores are not a valid history.');
  rows.push({ ...result.details, value: result.value, date: Date.now(), scoreMode: result.scope, unit: result.unit, lowerIsBetter: !!result.lowerIsBetter });
  localStorage.setItem(scoreKey(result.scope), JSON.stringify(rows.slice(-200)));
  if (result.scope.startsWith('visual')) {
    const key = `afterimage-best-${result.scope}`;
    const previous = Number(localStorage.getItem(key)) || 0;
    localStorage.setItem(key, String(Math.max(previous, result.value)));
  }
}
const labels: Record<string, string> = { mouse: 'Mouse', touch: 'Touch', keyboard: 'Keyboard practice', pen: 'Pen' };
export function scopeChoices(id: GameId, activeScope = initialScope(id)): [string, string][] {
  const game = baseGame(id);
  const options: [string, string][] = [];
  const add = (scope: string, label: string) => { if (!options.some(([key]) => scoreKey(key) === scoreKey(scope))) options.push([scope, label]); };
  const fixed: Record<string, [string, string][]> = {
    visual: [['visual-v3-standard', 'Standard'], ['visual-v3-long', 'Previous longer preview'], ['visual-v2-standard', 'Previous standard'], ['visual-v2-long', 'Earlier longer preview'], ['visual', 'Original standard'], ['visual-long', 'Original longer preview']],
    sequence: [['sequence-v3-growing', 'Growing pattern'], ['sequence-v2-fresh', 'New pattern each round'], ['sequence-v2-growing', 'Earlier growing rules']],
    reverse: [['reverse-v2-growing', 'Growing pattern'], ['reverse-v2-fresh', 'New pattern each round']],
    number: [['number-v2-hb', 'Current rules'], ['number', 'Earlier rules']],
    verbal: [['verbal-v5-progressive', 'Current rules'], ['verbal-v4-balanced', 'Previous balanced rules'], ['verbal-v3-related', 'Earlier related rules'], ['verbal-v2-random', 'Earlier random rules'], ['verbal', 'Original rules']],
    typing: [['typing-v4-hardware-passage', 'Hardware keyboard · passage'], ['typing-v4-onscreen-passage', 'On-screen keyboard · passage'], ['typing-v3-hardware-60s', 'Earlier 60s · hardware'], ['typing-v3-onscreen-60s', 'Earlier 60s · on-screen'], ['typing', 'Earlier 60s · keyboard unknown']],
    rotation: [['rotation-v4-60s', '60 seconds'], ['rotation-v3-60s', 'Earlier rules · 60 seconds'], ['rotation-v2-12', 'Previous · 12 questions'], ['rotation-v1-12', 'Earlier · 12 questions']],
    patterns: [['patterns-v4-60s', '60 seconds'], ['patterns-v3-60s', 'Earlier rules · 60 seconds'], ['patterns-v1-12', 'Previous · 12 questions']],
    'paper-folding': [['paper-folding-v2-60s', 'Current rules'], ['paper-folding-v1-60s', 'Earlier rules']],
    deduction: [['deduction-v3-letters-60s', 'Letters'], ['deduction-v3-images-60s', 'Images'], ['deduction-v2-60s', 'Earlier rules · letters'], ['deduction-v1-60s', 'Earlier rules · continuous clock']],
    'colour-match': [['colour-match-v2-60s', 'Current rules'], ['colour-match-v1-60s', 'Earlier rules']],
    search: [['search-v2-30s', '30 seconds'], ['search-v1-30s', 'Previous · release']],
    cps: [['cps-v1-mouse-10s', 'Mouse · 10 seconds'], ['tps-v3-touch-10s', 'Touch · 10 seconds'], ['tps-v2-touch-10s', 'Previous touch · release'], ['tps-v1-touch-10s', 'Earlier touch · press']],
    reaction: [['reaction-v7-desktop', 'Mouse / keyboard · short wait'], ['reaction-v7-touch-release', 'Touch · release · short wait'], ['reaction-v7-pen', 'Pen · short wait'], ['reaction-v5-desktop', 'Previous wait · mouse / keyboard'], ['reaction-v6-touch-release', 'Previous wait · touch release'], ['reaction-v5-touch', 'Previous touch · press'], ['reaction-v5-pen', 'Previous wait · pen']],
  };
  if (game === 'rhythm') for (const kind of ['mouse', 'touch', 'keyboard', 'pen']) add(`rhythm-v1-${kind}`, kind === 'keyboard' ? 'Keyboard' : labels[kind]);
  fixed[game]?.forEach(([scope, label]) => add(scope, label));
  if (['aim', 'chimp'].includes(game)) for (const format of ['standard', 'compact']) for (const kind of ['mouse', 'touch', 'keyboard', 'pen']) add(`${game}-${game === 'chimp' ? 'v3' : ['touch', 'keyboard'].includes(kind) ? 'v6' : 'v4'}-${format}-${kind}`, `${labels[kind]} · ${format}`);
  if (game === 'chimp') for (const format of ['standard', 'compact']) for (const kind of ['mouse', 'touch', 'keyboard', 'pen']) add(`chimp-v2-${format}-${kind}`, `Earlier rules · ${labels[kind]} · ${format}`);
  if (game === 'aim') for (const format of ['standard', 'compact']) for (const kind of ['touch', 'keyboard']) for (const version of ['v4', 'v5']) add(`aim-${version}-${format}-${kind}`, `Earlier ${labels[kind]} · ${format} · ${version}`);
  if (['reaction', 'pairs', 'order', 'aim'].includes(game)) for (const kind of ['mouse', 'touch', 'keyboard', 'pen']) {
    if (['pairs', 'order'].includes(game)) add(`${game}-${game === 'pairs' ? 'v4' : 'v2'}-${kind}`, labels[kind]);
    if (game === 'order') add(`order-v1-${kind}`, `Earlier rules · ${labels[kind]}`);
    if (game !== 'order') for (const version of game === 'reaction' ? [4, 3] : game === 'pairs' ? [3, 2, 1] : [3]) add(`${game}-v${version}-${kind}`, `${game === 'pairs' && version === 3 ? 'Timed objects' : game === 'pairs' && version === 2 ? 'Letters' : 'Earlier rules'} · ${labels[kind]} · v${version}`);
  }
  if (['aim', 'reaction', 'chimp'].includes(game)) add(game, 'Earlier runs');
  if (!options.length) add(initialScope(id), 'Current rules');
  // Include unknown stored revisions so upgrading never hides an existing score set.
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith('afterimage-history-')) continue;
    const scope = key.slice('afterimage-history-'.length);
    if (game === 'tracking' && (scope === 'tracking-hard' || scope.startsWith('tracking-hard-'))) continue;
    if (scope === game || scope.startsWith(`${game}-`) || game === 'cps' && scope.startsWith('tps-')) add(scope, `Saved rules · ${scope}`);
  }
  add(activeScope, 'Current results');
  const hasSavedData = (scope: string) => {
    const raw = localStorage.getItem(scoreKey(scope));
    if (raw !== null) {
      try {
        const value: unknown = JSON.parse(raw);
        if (!Array.isArray(value) || value.length > 0) return true;
      } catch { return true; } // Keep damaged or future formats accessible for recovery.
    }
    if (game !== 'visual') return false;
    const legacy = scope === 'visual' ? 'standard' : scope === 'visual-long' ? 'long' : scope;
    return Number(localStorage.getItem(`afterimage-best-${legacy}`)) > 0;
  };
  const currentKey = scoreKey(activeScope);
  const active = options.find(([scope]) => scoreKey(scope) === currentKey)!;
  return [[activeScope, active[1]], ...options.filter(([scope]) => scoreKey(scope) !== currentKey && hasSavedData(scope))];
}
export function scopeUnit(id: GameId, scope: string): { unit: string; lower: boolean } {
  if (id === 'reaction' || id === 'aim') return { unit: 'ms', lower: true };
  if (id === 'number-order' || id === 'pairs' && !scope.startsWith('pairs-v4-')) return { unit: 's', lower: true };
  const units: Partial<Record<GameId, string>> = { visual: 'levels', sequence: 'levels', 'sequence-fresh': 'levels', reverse: 'levels', 'reverse-fresh': 'levels', number: 'digits', verbal: 'words', chimp: 'numbers', pairs: 'rounds', rhythm: 'levels', tracking: 'rounds', 'tracking-hard': 'rounds', typing: 'WPM', cps: scope.startsWith('tps') ? 'taps/s' : 'clicks/s' };
  return { unit: units[id] ?? (scope.endsWith('-12') ? 'correct' : 'points'), lower: false };
}
export function exportHistory() {
  const data: Record<string, string | null> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('afterimage-history-') || key?.startsWith('afterimage-best-')) data[key] = localStorage.getItem(key);
  }
  return JSON.stringify({ application: 'afterimage', version: 2, exportedAt: new Date().toISOString(), data }, null, 2);
}
export function importHistory(text: string) {
  const parsed: unknown = JSON.parse(text);
  if (!parsed || typeof parsed !== 'object' || !('data' in parsed) || !parsed.data || typeof parsed.data !== 'object' || Array.isArray(parsed.data)) throw new Error('Choose an Afterimage history export.');
  const staged: [string, string][] = [];
  let count = 0;
  let recognized = false;
  for (const [key, raw] of Object.entries(parsed.data)) {
    if (!key.startsWith('afterimage-history-') && !key.startsWith('afterimage-best-')) continue;
    recognized = true;
    if ('version' in parsed && parsed.version === 2 && typeof raw === 'string') {
      const previousRaw = localStorage.getItem(key);
      if (previousRaw === raw) continue;
      if (previousRaw === null) {
        staged.push([key, raw]);
        try { const rows: unknown = JSON.parse(raw); if (Array.isArray(rows)) count += rows.filter((row: unknown) => row && typeof row === 'object' && 'value' in row && Number.isFinite(row.value)).length; } catch { /* Opaque legacy keys are restored byte for byte. */ }
        continue;
      }
    }
    const value: unknown = 'version' in parsed && parsed.version === 2 && typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (key.startsWith('afterimage-history-')) {
      if (!Array.isArray(value) || value.some(row => !row || typeof row !== 'object' || !Number.isFinite((row as HistoryRow).value))) throw new Error(`Invalid scores in ${key}. No scores were imported.`);
      const previous: unknown = JSON.parse(localStorage.getItem(key) ?? '[]');
      if (!Array.isArray(previous)) throw new Error(`Existing ${key} cannot be read. Export your history before retrying.`);
      const existing = new Map<string, number>();
      for (const row of previous) { const identity = JSON.stringify(row); existing.set(identity, (existing.get(identity) ?? 0) + 1); }
      const merged: unknown[] = [...previous as unknown[]];
      for (const row of value) { const identity = JSON.stringify(row), matches = existing.get(identity) ?? 0; if (matches) existing.set(identity, matches - 1); else { merged.push(row); count++; } }
      staged.push([key, JSON.stringify(merged)]);
    } else if (key.startsWith('afterimage-best-') && typeof value === 'number' && Number.isFinite(value)) staged.push([key, String(Math.max(value, Number(localStorage.getItem(key)) || 0))]);
  }
  if (!recognized) throw new Error('No Afterimage history was found in this file.');
  const previous = staged.map(([key]) => [key, localStorage.getItem(key)] as const);
  try { for (const [key, value] of staged) localStorage.setItem(key, value); }
  catch (error) { for (const [key, value] of previous) { try { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value); } catch { /* Preserve the original storage error. */ } } throw error; }
  return count;
}
