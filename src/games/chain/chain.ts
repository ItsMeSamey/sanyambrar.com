import { animateMountedViewSwap } from '../../shared/transitions.ts';
import type { ChainRefs } from './dom.ts';

type GridConfig = { rows: number; cols: number };
type Config = GridConfig & { enemies: number };
type Limit = readonly [min: number, max: number];
type Page = 'menu' | 'game' | 'stats';
type Direction = 'forward' | 'back';
type BotSettings = { thinkMinMs?: number; thinkMaxMs?: number } & Record<string, unknown>;
type Bot = { id: string; name: string; version: number; settings: BotSettings };
type Player = { id: number; name: string; kind: 'human' | 'bot'; color: string; bot?: Bot };
type Move = { owner: number; index: number };
type MatchStatus = 'active' | 'completed' | 'abandoned';
type Match = { id: string; t: number; u: number; end: number; s: MatchStatus; w: number; r: number; c: number; e: number; m: number[]; q: boolean; p: Player[]; parent: string; fork: number };
type MatchDb = { v: 1; base: { games: number; wins: number; largest: number }; matches: Match[] };
type RecentStat = { t: number; w: boolean; r: number; c: number; e: number; x: number; m: number[] | null };
type Stats = { games: number; wins: number; largest: number; recent: RecentStat[] };
type SavedGame = { config: Config; board: Uint8Array; owners: Uint8Array; entered: Uint8Array; turn: number; gameOver: boolean; inGame: boolean; moves: number[]; replayComplete: boolean; matchId: string; players: Player[] };
type Transfer = { from: number; to: number; owner: number };
type Particle = Transfer & { start: number; duration: number };
type ReplayWave = { board: Uint8Array; owners: Uint8Array; transfers: Transfer[] };
type ReplayFrame = { board: Uint8Array; owners: Uint8Array; entered: Uint8Array; move: Move | null; waves: ReplayWave[]; winner: number; turn: number };
type ReplayModel = { cfg: Config; playerCount: number; board: Uint8Array; owners: Uint8Array; entered: Uint8Array; degrees: Uint8Array; links: number[][] };
type Geometry = { w: number; h: number; cell: number; ox: number; oy: number; scale: number };
type ReplayGeometry = Geometry & { cfg: GridConfig };
type ReplayResult = { move: Move; waves: ReplayWave[]; winner: number; turnAfter: number };
type UnknownRecord = Record<string, unknown>;
const isRecord = (value: unknown): value is UnknownRecord => value != null && typeof value === 'object';
const record = (value: unknown): UnknownRecord => isRecord(value) ? value : {};

export function mountChain(refs: ChainRefs) {
  'use strict';

  const {
    canvas, stage, statusEl, turnEl, youSwatch, activeSwatch, settingsButton, settingsPanel,
    newGameButton, rowsInput, colsInput, enemiesInput, rowsValue, colsValue, enemiesValue,
    openingView, gameView, menuButton, resumeCard, resumeButton, resumeEyebrow, resumeTitle,
    resumeCopy, resumeSpec, quickButton, resultPanel, resultTitle, resultCopy, playAgainButton,
    resultMenuButton, statsButtons, statsBackButton, statsView, statGames, statWins, statRate,
    statLargest, statRecent, replayPanel, replayCanvas, replayTitle, replayCopy, replayClose,
    replayPrev, replayPlay, replayNext, replayResume, replayStatus, presets,
  } = refs;
  const mainContext = canvas.getContext('2d', { alpha: false, desynchronized: true });
  if (!mainContext) return () => {};
  const ctx = mainContext;

  const EMPTY = 0;
  const HUMAN = 1;
  const limits: Record<keyof Config, Limit> = { rows: [4, 30], cols: [4, 30], enemies: [1, 5] };
  const defaults: Config = { rows: 9, cols: 6, enemies: 1 };
  const GAME_KEY = 'samey.chain.game.v4';
  const LEGACY_GAME_KEY = 'samey.chain.game.v3';
  const LEGACY_GAME_KEY_V2 = 'samey.chain.game.v2';
  const MATCHES_KEY = 'samey.chain.matches.v1';
  const STATS_KEY = 'samey.chain.stats.v2';
  const LEGACY_STATS_KEY = 'samey.chain.stats.v1';
  const PAGE_QUERY = 'p';
  const PAGE_MENU: Page = 'menu';
  const PAGE_GAME: Page = 'game';
  const PAGE_STATS: Page = 'stats';
  let pageHistoryIndex = typeof history.state?.chainPageIndex === 'number' ? history.state.chainPageIndex : 0;
  let config = loadConfig();
  let rows = config.rows;
  let cols = config.cols;
  let playerCount = config.enemies + 1;
  let board = new Uint8Array(0), owners = new Uint8Array(0), degree = new Uint8Array(0), neighbors: number[][] = [], entered = new Uint8Array(0);
  let turn = HUMAN;
  let locked = false;
  let gameOver = false;
  let cssW = 0, cssH = 0, cell = 0, ox = 0, oy = 0, dpr = 1;
  let frame = 0;
  let focusCell = 0;
  let particles: Particle[] = [];
  let gameVersion = 0;
  let pendingPage: Page | null = null;
  let resultRecorded = false;
  let moveHistory: number[] = [];
  let replayComplete = true;
  let replayEntry: Match | null = null;
  let replayFrames: ReplayFrame[] = [];
  let replayIndex = 0;
  let replayTimer = 0;
  let replayRunId = 0;
  let replayDisplay: ReplayWave | null = null;
  let replayParticles: Particle[] = [];
  let replayFrame = 0;
  let currentMatchId = '';
  let gamePlayers: Player[] = [];
  const replayContext = replayCanvas.getContext('2d', { alpha: false });
  if (!replayContext) return () => {};
  const replayCtx = replayContext;
  const orbCache = new Map<string, HTMLCanvasElement>();

  function pageFromLocation(): Page {
    const value = new URL(location.href).searchParams.get(PAGE_QUERY);
    return value === PAGE_GAME || value === PAGE_STATS ? value : PAGE_MENU;
  }

  function writePage(page: Page, replace = false) {
    const url = new URL(location.href);
    if (page === PAGE_MENU) url.searchParams.delete(PAGE_QUERY);
    else url.searchParams.set(PAGE_QUERY, page);
    if (url.href === location.href) return;
    if (!replace) pageHistoryIndex++;
    history[replace ? 'replaceState' : 'pushState']({...(history.state || {}), chainPage: page, chainPageIndex: pageHistoryIndex}, '', url);
  }

  function clampInt(value: unknown, min: number, max: number, fallback: number) {
    const n = Number.parseInt(String(value), 10);
    return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
  }

  function loadConfig(): Config {
    try {
      const saved = JSON.parse(localStorage.getItem('samey.chain.settings') || '{}');
      return {
        rows: clampInt(saved.rows, ...limits.rows, defaults.rows),
        cols: clampInt(saved.cols, ...limits.cols, defaults.cols),
        enemies: clampInt(saved.enemies, ...limits.enemies, defaults.enemies),
      };
    } catch { return {...defaults}; }
  }

  function saveConfig() {
    try { localStorage.setItem('samey.chain.settings', JSON.stringify(config)); } catch {}
  }

  function bytesToB64(bytes: Uint8Array) {
    let out = '';
    for (let i = 0; i < bytes.length; i += 0x8000) out += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(out);
  }

  function b64ToBytes(text: unknown, expected: number): Uint8Array | null {
    try {
      const raw = atob(String(text || ''));
      if (raw.length !== expected) return null;
      const out = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
      return out;
    } catch { return null; }
  }

  function decodeMove(value: unknown, count: number, maxPlayer: number): Move | null {
    const encoded = Number(value);
    if (!Number.isInteger(encoded) || encoded < 1024) return null;
    const owner = Math.floor(encoded / 1024);
    const index = encoded % 1024;
    if (owner < 1 || owner > maxPlayer || index < 0 || index >= count) return null;
    return {owner, index};
  }

  const encodeMove = (owner: number, index: number) => owner * 1024 + index;

  const newMatchId = () => `chain-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,9)}`;

  function createPlayers(enemies: number): Player[] {
    const players: Player[] = [{id:HUMAN,name:'You',kind:'human',color:semanticPlayerColor(HUMAN)}];
    for (let i = 1; i <= enemies; i++) players.push({
      id:i+1,
      name:`Random Bot ${i}`,
      kind:'bot',
      color:semanticPlayerColor(i+1),
      bot:{id:'random',name:'Random Bot',version:1,settings:{thinkMinMs:65,thinkMaxMs:135}},
    });
    return players;
  }

  function normalizePlayers(raw: unknown, enemies: number): Player[] {
    const count = enemies + 1;
    if (!Array.isArray(raw) || raw.length !== count) return createPlayers(enemies);
    const out = [];
    for (let i = 0; i < count; i++) {
      const item = raw[i] || {};
      const id = i + 1;
      const kind = id === HUMAN ? 'human' : 'bot';
      const colorValue = typeof item.color === 'string' && item.color.trim() ? item.color.trim() : semanticPlayerColor(id);
      const name = typeof item.name === 'string' && item.name.trim() ? item.name.trim().slice(0,80) : (kind === 'human' ? 'You' : `Random Bot ${id-1}`);
      const player: Player = {id,name,kind,color:colorValue};
      if (kind === 'bot') {
        const bot = record(item.bot);
        player.bot = {
          id: typeof bot.id === 'string' && bot.id ? bot.id : 'random',
          name: typeof bot.name === 'string' && bot.name ? bot.name : 'Random Bot',
          version: Number.isInteger(Number(bot.version)) ? Number(bot.version) : 1,
          settings: isRecord(bot.settings) ? {...bot.settings} : {thinkMinMs:65,thinkMaxMs:135},
        };
      }
      out.push(player);
    }
    return out;
  }

  function emptyMatchDb(): MatchDb { return {v:1,base:{games:0,wins:0,largest:0},matches:[]}; }

  function normalizeMatch(raw: unknown): Match | null {
    if (!isRecord(raw)) return null;
    const r = clampInt(raw.r, ...limits.rows, 0), c = clampInt(raw.c, ...limits.cols, 0), e = clampInt(raw.e, ...limits.enemies, 0);
    if (!r || !c || !e) return null;
    const count = r * c, maxPlayer = e + 1;
    const moves = [];
    if (Array.isArray(raw.m)) for (const encoded of raw.m) {
      if (!decodeMove(encoded, count, maxPlayer)) break;
      moves.push(Number(encoded));
    }
    const status = raw.s === 'completed' || raw.s === 'abandoned' ? raw.s : 'active';
    const winner = Number.isInteger(Number(raw.w)) && Number(raw.w) >= 1 && Number(raw.w) <= maxPlayer ? Number(raw.w) : 0;
    return {
      id: typeof raw.id === 'string' && raw.id ? raw.id : newMatchId(),
      t: Number.isFinite(Number(raw.t)) ? Number(raw.t) : Date.now(),
      u: Number.isFinite(Number(raw.u)) ? Number(raw.u) : Date.now(),
      end: Number.isFinite(Number(raw.end)) ? Number(raw.end) : 0,
      s: status,
      w: winner,
      r,c,e,m:moves,q:raw.q !== false,
      p: normalizePlayers(raw.p, e),
      parent: typeof raw.parent === 'string' ? raw.parent : '',
      fork: Number.isInteger(Number(raw.fork)) ? Math.max(0, Number(raw.fork)) : 0,
    };
  }

  function loadMatchDb(): MatchDb {
    try {
      const stored = JSON.parse(localStorage.getItem(MATCHES_KEY) || 'null');
      if (stored?.v === 1 && Array.isArray(stored.matches)) {
        return {
          v:1,
          base:{games:Math.max(0,Number(stored.base?.games)||0),wins:Math.max(0,Number(stored.base?.wins)||0),largest:Math.max(0,Number(stored.base?.largest)||0)},
          matches: (stored.matches as unknown[]).map(normalizeMatch).filter((match): match is Match => match != null).slice(0,120),
        };
      }
      const legacy = loadStats();
      const legacyRecent = legacy.recent || [];
      const representedWins = legacyRecent.filter(entry => entry.w).length;
      const db: MatchDb = {
        v:1,
        base:{
          games:Math.max(0, legacy.games - legacyRecent.length),
          wins:Math.max(0, legacy.wins - representedWins),
          largest:legacy.largest || 0,
        },
        matches:legacyRecent.map(entry => ({
          id:newMatchId(),t:entry.t,u:entry.t,end:entry.t,s:'completed',w:entry.x || (entry.w ? HUMAN : 0),
          r:entry.r,c:entry.c,e:entry.e,m:Array.isArray(entry.m)?entry.m.slice():[],q:Array.isArray(entry.m)&&entry.m.length>0,p:createPlayers(entry.e),parent:'legacy',fork:0,
        })),
      };
      localStorage.setItem(MATCHES_KEY, JSON.stringify(db));
      return db;
    } catch { return emptyMatchDb(); }
  }

  function persistMatchDb(db: MatchDb) {
    try { localStorage.setItem(MATCHES_KEY, JSON.stringify({...db,matches:db.matches.slice(0,120)})); } catch {}
  }


  function syncMatchRecord(status: MatchStatus = gameOver ? 'completed' : 'active', winner = gameOver ? turn : 0) {
    if (!currentMatchId) return;
    const db = loadMatchDb();
    let match = db.matches.find(item => item.id === currentMatchId);
    if (!match) {
      match = {id:currentMatchId,t:Date.now(),u:Date.now(),end:0,s:'active',w:0,r:config.rows,c:config.cols,e:config.enemies,m:[],q:true,p:gamePlayers,parent:'',fork:0};
      db.matches.unshift(match);
    }
    match.u = Date.now();
    match.r = config.rows; match.c = config.cols; match.e = config.enemies;
    match.m = moveHistory.slice();
    match.q = replayComplete;
    match.p = gamePlayers.map(player => ({...player,bot:player.bot ? {...player.bot,settings:{...player.bot.settings}} : undefined}));
    match.s = status;
    match.w = winner || 0;
    if (status === 'completed' || status === 'abandoned') match.end = match.end || Date.now();
    else match.end = 0;
    db.matches.sort((a,b) => b.u - a.u);
    persistMatchDb(db);
  }

  function abandonCurrentMatch() {
    if (!currentMatchId || gameOver) return;
    syncMatchRecord('abandoned', 0);
  }

  function readSavedGame(): SavedGame | null {
    try {
      let saved = JSON.parse(localStorage.getItem(GAME_KEY) || 'null');
      let version = 4;
      if (!saved) { saved = JSON.parse(localStorage.getItem(LEGACY_GAME_KEY) || 'null'); version = 3; }
      if (!saved) { saved = JSON.parse(localStorage.getItem(LEGACY_GAME_KEY_V2) || 'null'); version = 2; }
      if (!saved || Number(saved.v) !== version) return null;
      const readInt = (value: unknown, [min, max]: Limit) => {
        const n = Number(value);
        return Number.isInteger(n) && n >= min && n <= max ? n : null;
      };
      const rowsSaved = readInt(saved.r, limits.rows);
      const colsSaved = readInt(saved.c, limits.cols);
      const enemiesSaved = readInt(saved.e, limits.enemies);
      if (rowsSaved == null || colsSaved == null || enemiesSaved == null) return null;
      const cfg = {rows: rowsSaved, cols: colsSaved, enemies: enemiesSaved};
      const count = cfg.rows * cfg.cols;
      const b = b64ToBytes(saved.b, count), o = b64ToBytes(saved.o, count), enteredSaved = b64ToBytes(saved.p, cfg.enemies + 2);
      if (!b || !o || !enteredSaved) return null;
      const maxPlayer = cfg.enemies + 1;
      let savedTurn = Number(saved.t);
      if (!Number.isInteger(savedTurn) || savedTurn < 1 || savedTurn > maxPlayer) return null;
      for (let player = 0; player < enteredSaved.length; player++) if (enteredSaved[player] > 1) return null;
      const live = new Uint8Array(maxPlayer + 1);
      for (let r = 0; r < cfg.rows; r++) for (let c = 0; c < cfg.cols; c++) {
        const i = r * cfg.cols + c;
        const d = (r > 0 ? 1 : 0) + (r + 1 < cfg.rows ? 1 : 0) + (c > 0 ? 1 : 0) + (c + 1 < cfg.cols ? 1 : 0);
        if (b[i] >= d || o[i] > maxPlayer || (!b[i] && o[i]) || (b[i] && !o[i])) return null;
        if (o[i]) enteredSaved[o[i]] = live[o[i]] = 1;
      }
      enteredSaved[0] = 0;
      let allEntered = true, sole = EMPTY;
      for (let player = 1; player <= maxPlayer; player++) {
        if (!enteredSaved[player]) allEntered = false;
        if (!live[player]) continue;
        if (sole) sole = -1; else sole = player;
      }
      if (allEntered && sole === EMPTY) return null;
      let savedOver = saved.g === true;
      if (savedOver) {
        if (!allEntered || sole <= EMPTY || savedTurn !== sole) return null;
      } else if (allEntered && sole > EMPTY) {
        savedOver = true;
        savedTurn = sole;
      }
      if (saved.i !== true && saved.i !== false) return null;
      const moves = [];
      let historyComplete = version >= 3 && saved.q !== false;
      if (version >= 3 && Array.isArray(saved.m)) {
        for (const encoded of saved.m) {
          const move = decodeMove(encoded, count, maxPlayer);
          if (!move) { historyComplete = false; break; }
          moves.push(Number(encoded));
        }
      } else historyComplete = false;
      return {
        config:cfg,board:b,owners:o,entered:enteredSaved,turn:savedTurn,gameOver:savedOver,inGame:saved.i,moves,replayComplete:historyComplete,
        matchId:version >= 4 && typeof saved.id === 'string' ? saved.id : '',
        players:version >= 4 ? normalizePlayers(saved.pl, cfg.enemies) : createPlayers(cfg.enemies),
      };
    } catch { return null; }
  }

  function saveGameState(inGame = !gameView.hidden) {
    if (!board || !owners || !entered) return;
    try {
      localStorage.setItem(GAME_KEY, JSON.stringify({
        v:4,id:currentMatchId,pl:gamePlayers,r:config.rows,c:config.cols,e:config.enemies,
        b:bytesToB64(board),o:bytesToB64(owners),p:bytesToB64(entered),
        t:turn,g:gameOver,i:inGame,m:moveHistory,q:replayComplete
      }));
      localStorage.removeItem(LEGACY_GAME_KEY);
      localStorage.removeItem(LEGACY_GAME_KEY_V2);
    } catch {}
    syncMatchRecord(gameOver ? 'completed' : 'active', gameOver ? turn : 0);
    updateResumeCard();
    renderStats();
  }

  function emptyStats(): Stats { return {games:0,wins:0,largest:0,recent:[]}; }

  function normalizeStats(value: unknown): Stats {
    if (!isRecord(value)) return emptyStats();
    const recent: RecentStat[] = [];
    if (Array.isArray(value.recent)) for (const rawValue of value.recent.slice(0, 30)) {
      const raw = record(rawValue);
      const r = clampInt(raw.r, ...limits.rows, 0), c = clampInt(raw.c, ...limits.cols, 0), e = clampInt(raw.e, ...limits.enemies, 0);
      if (!r || !c || !e) continue;
      const count = r * c, maxPlayer = e + 1;
      let moves = null;
      if (Array.isArray(raw.m)) {
        const parsed = [];
        let valid = true;
        for (const encoded of raw.m) {
          if (!decodeMove(encoded, count, maxPlayer)) { valid = false; break; }
          parsed.push(Number(encoded));
        }
        if (valid && parsed.length) moves = parsed;
      }
      recent.push({
        t: Number.isFinite(Number(raw.t)) ? Number(raw.t) : Date.now(),
        w: raw.w === true,
        r, c, e,
        x: Number.isInteger(Number(raw.x)) && Number(raw.x) >= 1 && Number(raw.x) <= maxPlayer ? Number(raw.x) : (raw.w === true ? HUMAN : 0),
        m: moves,
      });
    }
    return {
      games: Math.max(0, Number(value.games) || 0),
      wins: Math.max(0, Number(value.wins) || 0),
      largest: Math.max(0, Number(value.largest) || 0),
      recent,
    };
  }

  function loadStats(): Stats {
    try {
      const current = JSON.parse(localStorage.getItem(STATS_KEY) || 'null');
      if (current) return normalizeStats(current);
      const legacy = JSON.parse(localStorage.getItem(LEGACY_STATS_KEY) || 'null');
      return normalizeStats(legacy);
    } catch { return emptyStats(); }
  }


  function recordResult(winner: number) {
    if (resultRecorded) return;
    resultRecorded = true;
    syncMatchRecord('completed', winner);
    renderStats();
  }

  function renderStats() {
    const db = loadMatchDb();
    const completed = db.matches.filter(match => match.s === 'completed');
    const games = db.base.games + completed.length;
    const wins = db.base.wins + completed.filter(match => match.w === HUMAN).length;
    const largest = Math.max(db.base.largest, ...completed.map(match => match.r * match.c), 0);
    statGames.textContent = String(games);
    statWins.textContent = String(wins);
    statRate.textContent = games ? `${(wins / games * 100).toFixed(1)}%` : '–';
    statLargest.textContent = largest ? `${largest} cells` : '–';
    statRecent.replaceChildren();
    const matches = db.matches.slice().sort((a,b) => b.u - a.u);
    if (!matches.length) {
      const empty = document.createElement('div');
      empty.className = 'chain-stat-empty';
      empty.textContent = 'No matches yet.';
      statRecent.append(empty);
      return;
    }
    for (const entry of matches) {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'chain-stat-row chain-stat-row-button';
      const main = document.createElement('span');
      main.className = 'chain-stat-row-main';
      const bots = entry.p.filter(player => player.kind === 'bot').map(player => player.name).join(', ');
      main.textContent = `${entry.r} × ${entry.c} · ${entry.e} ${entry.e===1?'enemy':'enemies'}`;
      const meta = document.createElement('small');
      meta.className = 'chain-stat-row-meta';
      meta.textContent = `${entry.m.length} ${entry.m.length===1?'move':'moves'} · ${bots || 'No bots'}`;
      main.append(meta);
      const outcome = document.createElement('strong');
      if (entry.s === 'completed') {
        outcome.dataset.win = String(entry.w === HUMAN);
        outcome.textContent = entry.w === HUMAN ? 'WIN' : 'LOSS';
      } else {
        outcome.dataset.state = entry.s;
        outcome.textContent = entry.s === 'abandoned' ? 'ABANDONED' : 'IN PROGRESS';
      }
      const date = document.createElement('time');
      date.dateTime = new Date(entry.u).toISOString();
      date.textContent = new Date(entry.u).toLocaleDateString();
      const replay = document.createElement('span');
      replay.className = 'chain-stat-row-replay';
      replay.textContent = entry.q ? 'Open ›' : 'No replay';
      row.append(main, outcome, date, replay);
      if (entry.q) row.addEventListener('click', () => openReplay(entry));
      else row.disabled = true;
      statRecent.append(row);
    }
  }

  function topologyFor(cfg: GridConfig) {
    const count = cfg.rows * cfg.cols;
    const degrees = new Uint8Array(count);
    const links: number[][] = Array.from({length: count}, () => []);
    for (let r = 0; r < cfg.rows; r++) for (let c = 0; c < cfg.cols; c++) {
      const i = r * cfg.cols + c;
      if (r) links[i].push(i - cfg.cols);
      if (c) links[i].push(i - 1);
      if (c + 1 < cfg.cols) links[i].push(i + 1);
      if (r + 1 < cfg.rows) links[i].push(i + cfg.cols);
      degrees[i] = links[i].length;
    }
    return {degrees, links};
  }

  function replayWinner(model: ReplayModel, owner: number, pending: Uint32Array | null = null) {
    for (let p = 1; p <= model.playerCount; p++) if (!model.entered[p]) return EMPTY;
    const live = new Uint8Array(model.playerCount + 1);
    for (let i = 0; i < model.board.length; i++) if (model.board[i]) live[model.owners[i]] = 1;
    if (pending) for (let i = 0; i < pending.length; i++) if (pending[i]) { live[owner] = 1; break; }
    let sole = EMPTY;
    for (let p = 1; p <= model.playerCount; p++) {
      if (!model.entered[p] || !live[p]) continue;
      if (sole) return EMPTY;
      sole = p;
    }
    return sole;
  }

  function modelHasCells(model: ReplayModel, owner: number) {
    for (let i = 0; i < model.owners.length; i++) if (model.owners[i] === owner) return true;
    return false;
  }

  function nextPlayerForModel(model: ReplayModel, owner: number) {
    for (let step = 1; step <= model.playerCount; step++) {
      const candidate = ((owner - 1 + step) % model.playerCount) + 1;
      if (!model.entered[candidate] || modelHasCells(model, candidate)) return candidate;
    }
    return HUMAN;
  }

  function simulateReplayMove(model: ReplayModel, encoded: number): ReplayResult | null {
    const move = decodeMove(encoded, model.board.length, model.playerCount);
    if (!move) return null;
    model.entered[move.owner] = 1;
    let pending = new Uint32Array(model.board.length);
    pending[move.index] = 1;
    const winningStates = new Set();
    const waves: ReplayWave[] = [];
    let winner = EMPTY;
    for (let guard = 0; guard < 20000; guard++) {
      const next = new Uint32Array(model.board.length);
      const transfers: Transfer[] = [];
      let any = false;
      for (let i = 0; i < pending.length; i++) {
        const incoming = pending[i];
        if (!incoming) continue;
        any = true;
        const total = model.board[i] + incoming;
        const d = model.degrees[i];
        const bursts = Math.floor(total / d);
        const remainder = total - bursts * d;
        model.board[i] = remainder;
        model.owners[i] = remainder ? move.owner : EMPTY;
        if (bursts) for (const n of model.links[i]) {
          next[n] += bursts;
          transfers.push({from:i,to:n,owner:move.owner});
        }
      }
      if (!any) break;
      waves.push({board:model.board.slice(),owners:model.owners.slice(),transfers});
      let hasNext = false;
      for (let i = 0; i < next.length; i++) if (next[i]) { hasNext = true; break; }
      if (!hasNext) break;
      const winNow = replayWinner(model, move.owner, next);
      if (winNow) {
        const signature = `${bytesToB64(model.board)}:${bytesToB64(new Uint8Array(next.buffer))}`;
        if (winningStates.has(signature)) { winner = winNow; break; }
        winningStates.add(signature);
      }
      pending = next;
    }
    winner ||= replayWinner(model, move.owner);
    const turnAfter = winner || nextPlayerForModel(model, move.owner);
    return {move,waves,winner,turnAfter};
  }

  function buildReplayFrames(entry: Match): ReplayFrame[] {
    const cfg = {rows:entry.r, cols:entry.c, enemies:entry.e};
    const topology = topologyFor(cfg);
    const model = {
      cfg,
      playerCount: cfg.enemies + 1,
      board: new Uint8Array(cfg.rows * cfg.cols),
      owners: new Uint8Array(cfg.rows * cfg.cols),
      entered: new Uint8Array(cfg.enemies + 2),
      degrees: topology.degrees,
      links: topology.links,
    };
    const frames: ReplayFrame[] = [{board:model.board.slice(),owners:model.owners.slice(),entered:model.entered.slice(),move:null,waves:[],winner:0,turn:HUMAN}];
    for (const encoded of entry.m || []) {
      const result = simulateReplayMove(model, encoded);
      if (!result) break;
      frames.push({
        board:model.board.slice(),owners:model.owners.slice(),entered:model.entered.slice(),move:result.move,waves:result.waves,
        winner:result.winner,turn:result.turnAfter,
      });
    }
    return frames;
  }

  function replayGeometry(entry: Match): ReplayGeometry {
    const cfg = {rows:entry.r,cols:entry.c};
    const rect = replayCanvas.parentElement?.getBoundingClientRect() ?? replayCanvas.getBoundingClientRect();
    const maxW = Math.max(180, Math.min(680, rect.width - 24));
    const maxH = Math.max(180, Math.min(innerHeight * .44, 520));
    const cellSize = Math.max(4, Math.floor(Math.min(maxW / cfg.cols, maxH / cfg.rows)));
    const w = cfg.cols * cellSize + 2, h = cfg.rows * cellSize + 2;
    const scale = Math.min(devicePixelRatio || 1, 2.5);
    replayCanvas.style.width = `${w}px`;
    replayCanvas.style.height = `${h}px`;
    if (replayCanvas.width !== Math.max(1, Math.round(w * scale)) || replayCanvas.height !== Math.max(1, Math.round(h * scale))) {
      replayCanvas.width = Math.max(1, Math.round(w * scale));
      replayCanvas.height = Math.max(1, Math.round(h * scale));
    }
    replayCtx.setTransform(scale,0,0,scale,0,0);
    replayCtx.imageSmoothingEnabled = true;
    replayCtx.imageSmoothingQuality = 'high';
    return {cfg,w,h,cell:cellSize,ox:1,oy:1,scale};
  }

  function drawReplay(now = performance.now()) {
    replayFrame = 0;
    if (!replayCtx || replayPanel.hidden || !replayEntry || !replayFrames.length) return;
    const geom = replayGeometry(replayEntry);
    const frameData = replayDisplay || replayFrames[replayIndex];
    const alive = drawBoardScene(replayCtx, geom.cfg, frameData.board, frameData.owners, geom, replayEntry.p, replayParticles, now, -1);
    replayPrev.disabled = replayIndex <= 0 || !!replayTimer;
    replayNext.disabled = replayIndex >= replayFrames.length - 1 || !!replayTimer;
    replayResume.disabled = !!replayTimer;
    replayStatus.value = `Move ${replayIndex} / ${Math.max(0,replayFrames.length-1)}`;
    if (alive && !replayFrame) replayFrame = requestAnimationFrame(drawReplay);
    else if (!alive) replayParticles = [];
  }

  function stopReplay(resetLabel = true) {
    replayRunId++;
    if (replayTimer) clearTimeout(replayTimer);
    replayTimer = 0;
    replayParticles = [];
    replayDisplay = null;
    if (replayFrame) cancelAnimationFrame(replayFrame);
    replayFrame = 0;
    if (resetLabel) replayPlay.textContent = 'Play';
    drawReplay();
  }

  function waitReplay(ms: number, runId: number): Promise<boolean> {
    return new Promise<boolean>(resolve => {
      replayTimer = window.setTimeout(() => { replayTimer = 0; resolve(runId === replayRunId); }, ms);
    });
  }

  async function animateReplayMove(targetIndex: number, runId = ++replayRunId) {
    if (targetIndex <= 0 || targetIndex >= replayFrames.length) return false;
    const target = replayFrames[targetIndex];
    for (const wave of target.waves) {
      if (runId !== replayRunId) return false;
      replayDisplay = wave;
      const started = performance.now();
      replayParticles = wave.transfers.map(p => ({...p,start:started,duration:105}));
      drawReplay(started);
      if (!await waitReplay(82, runId)) return false;
    }
    replayIndex = targetIndex;
    replayDisplay = null;
    replayParticles = [];
    drawReplay();
    return true;
  }

  function setReplayIndex(next: number) {
    replayRunId++;
    if (replayTimer) clearTimeout(replayTimer);
    replayTimer = 0;
    replayDisplay = null;
    replayParticles = [];
    replayIndex = Math.max(0, Math.min(replayFrames.length - 1, next));
    replayPlay.textContent = 'Play';
    drawReplay();
  }

  function openReplay(entry: Match) {
    stopReplay();
    replayEntry = entry;
    replayFrames = buildReplayFrames(entry);
    replayIndex = 0;
    replayDisplay = null;
    const statusLabel = entry.s === 'completed' ? (entry.w === HUMAN ? 'Winning match' : 'Completed match') : (entry.s === 'abandoned' ? 'Abandoned match' : 'In-progress match');
    replayTitle.textContent = statusLabel;
    const bots = entry.p.filter(player => player.kind === 'bot').map(player => `${player.name} (${player.bot?.name || 'Bot'})`).join(', ');
    replayCopy.textContent = `${entry.r} × ${entry.c} board · ${entry.m.length} ${entry.m.length===1?'move':'moves'} · ${bots}`;
    replayPanel.hidden = false;
    requestAnimationFrame(() => { drawReplay(); replayPanel.scrollIntoView({block:'nearest',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'}); });
  }

  function closeReplay() {
    stopReplay();
    replayPanel.hidden = true;
    replayEntry = null;
    replayFrames = [];
    replayIndex = 0;
  }

  async function toggleReplay() {
    if (replayTimer || replayPlay.textContent === 'Pause') { stopReplay(); return; }
    if (replayIndex >= replayFrames.length - 1) replayIndex = 0;
    const runId = ++replayRunId;
    replayPlay.textContent = 'Pause';
    drawReplay();
    for (let next = replayIndex + 1; next < replayFrames.length; next++) {
      if (!await animateReplayMove(next, runId) || runId !== replayRunId) return;
      if (!await waitReplay(250, runId)) return;
    }
    if (runId === replayRunId) { replayPlay.textContent = 'Play'; replayTimer = 0; drawReplay(); }
  }

  function resumeReplayPoint() {
    if (!replayEntry || !replayFrames.length) return;
    stopReplay();
    const frameData = replayFrames[replayIndex];
    abandonCurrentMatch();
    gameVersion++;
    config = {rows:replayEntry.r,cols:replayEntry.c,enemies:replayEntry.e};
    saveConfig();
    rows = config.rows; cols = config.cols; playerCount = config.enemies + 1;
    buildBoard();
    board.set(frameData.board);
    owners.set(frameData.owners);
    entered.set(frameData.entered.subarray(0, entered.length));
    turn = frameData.turn || HUMAN;
    gameOver = !!frameData.winner;
    locked = false;
    resultRecorded = gameOver;
    moveHistory = replayEntry.m.slice(0,replayIndex);
    replayComplete = true;
    currentMatchId = newMatchId();
    gamePlayers = normalizePlayers(replayEntry.p, config.enemies);
    particles = [];
    focusCell = 0;
    syncSettings();
    updateStatus();
    const db = loadMatchDb();
    db.matches.unshift({
      id:currentMatchId,t:Date.now(),u:Date.now(),end:gameOver?Date.now():0,s:gameOver?'completed':'active',w:gameOver?frameData.winner:0,
      r:config.rows,c:config.cols,e:config.enemies,m:moveHistory.slice(),q:true,p:gamePlayers,parent:replayEntry.id,fork:replayIndex,
    });
    persistMatchDb(db);
    saveGameState(true);
    closeReplay();
    showGame();
  }

  function buildBoard() {
    rows = config.rows;
    cols = config.cols;
    playerCount = config.enemies + 1;
    board = new Uint8Array(rows * cols);
    owners = new Uint8Array(rows * cols);
    degree = new Uint8Array(rows * cols);
    neighbors = Array.from({length: rows * cols}, () => []);
    entered = new Uint8Array(playerCount + 1);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      if (r) neighbors[i].push(i - cols);
      if (c) neighbors[i].push(i - 1);
      if (c + 1 < cols) neighbors[i].push(i + 1);
      if (r + 1 < rows) neighbors[i].push(i + cols);
      degree[i] = neighbors[i].length;
    }
  }

  const css = () => getComputedStyle(document.documentElement);
  const color = (name: string, fallback: string) => css().getPropertyValue(name).trim() || fallback;
  const colorProbe = document.createElement('span');
  colorProbe.hidden = true;
  document.body.append(colorProbe);
  function resolvedColor(expression: string, fallback: string) {
    colorProbe.style.color = '';
    colorProbe.style.color = expression;
    return getComputedStyle(colorProbe).color || fallback;
  }
  function semanticPlayerColor(player: number): string {
    const themed = [
      '',
      'var(--site-fast-color, #16a34a)',
      'var(--site-error, #dc2626)',
      'var(--site-effort-color, #2563eb)',
      'var(--site-warning-color, #d4a72c)',
      'color-mix(in srgb, var(--site-effort-color, #2563eb) 58%, var(--site-fast-color, #16a34a))',
      'color-mix(in srgb, var(--site-error, #dc2626) 58%, var(--site-effort-color, #2563eb))',
    ];
    return resolvedColor(themed[player] || 'var(--site-effort-color)', color('--site-effort-color', '#2563eb'));
  }

  function playerColor(player: number, players: Player[] = gamePlayers): string {
    return players?.[player - 1]?.color || semanticPlayerColor(player);
  }

  function layout() {
    const rect = stage.getBoundingClientRect();
    const stageStyle = getComputedStyle(stage);
    const availableW = Math.max(1, rect.width - parseFloat(stageStyle.paddingLeft) - parseFloat(stageStyle.paddingRight));
    const availableH = Math.max(1, rect.height - parseFloat(stageStyle.paddingTop) - parseFloat(stageStyle.paddingBottom));
    dpr = Math.min(window.devicePixelRatio || 1, 3);
    const gap = 2;
    cell = Math.max(1, Math.floor(Math.min((availableW - gap) / cols, (availableH - gap) / rows)));
    cssW = Math.min(availableW, cols * cell + gap);
    cssH = Math.min(availableH, rows * cell + gap);
    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';
    canvas.width = Math.max(1, Math.round(cssW * dpr));
    canvas.height = Math.max(1, Math.round(cssH * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    orbCache.clear();
    ox = gap / 2; oy = gap / 2;
    draw(performance.now());
  }


  function atomOffsets(n: number, radius: number): [number, number][] {
    if (n <= 1) return [[0,0]];
    if (n === 2) return [[-radius*.36,0],[radius*.36,0]];
    if (n === 3) return [[0,-radius*.39],[-radius*.36,radius*.28],[radius*.36,radius*.28]];
    return [[-radius*.32,-radius*.32],[radius*.32,-radius*.32],[-radius*.32,radius*.32],[radius*.32,radius*.32]];
  }

  function rgb(value: string): [number, number, number] {
    const hex = /^#([0-9a-f]{6})$/i.exec(value);
    if (hex) return [Number.parseInt(hex[1]!.slice(0, 2), 16), Number.parseInt(hex[1]!.slice(2, 4), 16), Number.parseInt(hex[1]!.slice(4, 6), 16)];
    const match = /rgba?\(\s*([\d.]+)[, ]+([\d.]+)[, ]+([\d.]+)/i.exec(value);
    return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : [106,170,100];
  }
  function mixColor(a: string, b: string, t: number) {
    const [ar,ag,ab] = rgb(a), [br,bg,bb] = rgb(b);
    const c = (x: number, y: number) => Math.round(x + (y - x) * t);
    return `rgb(${c(ar,br)} ${c(ag,bg)} ${c(ab,bb)})`;
  }

  function orbSpriteFor(base: string, radius: number, scale: number): HTMLCanvasElement {
    const key = `${base}:${radius.toFixed(2)}:${scale.toFixed(2)}`;
    let sprite = orbCache.get(key);
    if (sprite) return sprite;
    const pad = 3, size = Math.ceil(radius * 2 + pad * 2);
    sprite = document.createElement('canvas');
    sprite.width = Math.ceil(size * scale);
    sprite.height = Math.ceil(size * scale);
    const g = sprite.getContext('2d');
    if (!g) return sprite;
    g.scale(scale, scale);
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';
    const c = size / 2;
    const gradient = g.createRadialGradient(c - radius*.34, c - radius*.38, radius*.08, c, c, radius*1.04);
    gradient.addColorStop(0, mixColor(base, 'rgb(255 255 255)', .38));
    gradient.addColorStop(.32, mixColor(base, 'rgb(255 255 255)', .12));
    gradient.addColorStop(.74, base);
    gradient.addColorStop(1, mixColor(base, 'rgb(0 0 0)', .30));
    g.shadowColor = 'rgba(0,0,0,.26)';
    g.shadowBlur = Math.max(1.5, radius * .22);
    g.shadowOffsetY = Math.max(.5, radius * .08);
    g.fillStyle = gradient;
    g.beginPath(); g.arc(c, c, radius, 0, Math.PI * 2); g.fill();
    g.shadowColor = 'transparent';
    g.strokeStyle = mixColor(base, 'rgb(0 0 0)', .20);
    g.lineWidth = Math.max(.65, radius * .07);
    g.stroke();
    orbCache.set(key, sprite);
    return sprite;
  }

  function drawOrbTo(targetCtx: CanvasRenderingContext2D, x: number, y: number, base: string, radius: number, scale: number, alpha = 1) {
    const sprite = orbSpriteFor(base, radius, scale);
    const w = sprite.width / scale, h = sprite.height / scale;
    const old = targetCtx.globalAlpha;
    targetCtx.globalAlpha = alpha;
    targetCtx.drawImage(sprite, x - w/2, y - h/2, w, h);
    targetCtx.globalAlpha = old;
  }

  function sceneCenter(index: number, cfg: GridConfig, geom: Geometry): [number, number] {
    return [geom.ox + (index % cfg.cols + .5) * geom.cell, geom.oy + (Math.floor(index / cfg.cols) + .5) * geom.cell];
  }

  function drawBoardScene(targetCtx: CanvasRenderingContext2D, cfg: GridConfig, boardData: Uint8Array, ownerData: Uint8Array, geom: Geometry, players: Player[], moving: Particle[], now: number, focus = -1) {
    targetCtx.fillStyle = color('--site-soft', '#f3f4f5');
    targetCtx.fillRect(0, 0, geom.w, geom.h);
    targetCtx.lineWidth = 1;
    targetCtx.strokeStyle = color('--site-line', '#d3d6da');
    targetCtx.beginPath();
    for (let c = 0; c <= cfg.cols; c++) { const x = geom.ox + c * geom.cell; targetCtx.moveTo(x, geom.oy); targetCtx.lineTo(x, geom.oy + cfg.rows * geom.cell); }
    for (let r = 0; r <= cfg.rows; r++) { const y = geom.oy + r * geom.cell; targetCtx.moveTo(geom.ox, y); targetCtx.lineTo(geom.ox + cfg.cols * geom.cell, y); }
    targetCtx.stroke();

    const atomR = Math.max(3.8, Math.min(11, geom.cell * .135));
    for (let i = 0; i < boardData.length; i++) {
      const count = boardData[i]; if (!count) continue;
      const [cx, cy] = sceneCenter(i, cfg, geom);
      const base = playerColor(ownerData[i], players);
      for (const [dx,dy] of atomOffsets(count, atomR)) drawOrbTo(targetCtx, cx + dx, cy + dy, base, atomR, geom.scale);
    }

    if (focus >= 0 && focus < boardData.length) {
      const [fx, fy] = sceneCenter(focus, cfg, geom);
      targetCtx.save();
      targetCtx.strokeStyle = color('--site-accent', '#6aaa64');
      targetCtx.lineWidth = 2;
      targetCtx.strokeRect(fx - geom.cell / 2 + 2, fy - geom.cell / 2 + 2, Math.max(0, geom.cell - 4), Math.max(0, geom.cell - 4));
      targetCtx.restore();
    }

    let alive = false;
    if (moving?.length) for (const particle of moving) {
      const t = Math.min(1, (now - particle.start) / particle.duration);
      if (t < 1) alive = true;
      const e = 1 - (1 - t) * (1 - t);
      const [x0,y0] = sceneCenter(particle.from, cfg, geom);
      const [x1,y1] = sceneCenter(particle.to, cfg, geom);
      drawOrbTo(targetCtx, x0 + (x1-x0)*e, y0 + (y1-y0)*e, playerColor(particle.owner, players), atomR, geom.scale, 1 - t*.12);
    }
    targetCtx.globalAlpha = 1;
    return alive;
  }

  function draw(now: number) {
    frame = 0;
    const geom = {w:cssW,h:cssH,cell,ox,oy,scale:dpr};
    const alive = drawBoardScene(ctx, {rows,cols}, board, owners, geom, gamePlayers, particles, now, (!gameOver && document.activeElement === canvas) ? focusCell : -1);
    if (alive) requestDraw(); else particles = [];
  }

  function requestDraw() { if (!frame) frame = requestAnimationFrame(draw); }

  function allPlayersEntered() {
    for (let player = 1; player <= playerCount; player++) if (!entered[player]) return false;
    return true;
  }

  function liveWinner(pendingOwner = EMPTY, pending: Uint32Array | null = null) {
    if (!allPlayersEntered()) return EMPTY;
    const live = new Uint8Array(playerCount + 1);
    for (let i = 0; i < board.length; i++) if (board[i]) live[owners[i]] = 1;
    if (pending && pendingOwner) {
      for (let i = 0; i < pending.length; i++) {
        if (pending[i]) { live[pendingOwner] = 1; break; }
      }
    }
    let sole = EMPTY;
    for (let player = 1; player <= playerCount; player++) {
      if (!entered[player] || !live[player]) continue;
      if (sole) return EMPTY;
      sole = player;
    }
    return sole;
  }

  function finishGame(win: number) {
    gameOver = true;
    turn = win;
    recordResult(win);
    locked = false;
    particles = [];
    updateStatus();
    saveGameState(true);
    showResult();
    requestDraw();
    if (pendingPage) {
      const page = pendingPage;
      pendingPage = null;
      queueMicrotask(() => page === PAGE_STATS ? showStats(false) : showMenu(false));
    }
  }

  function updateStatus() {
    youSwatch.style.backgroundColor = playerColor(HUMAN);
    activeSwatch.style.backgroundColor = playerColor(turn || HUMAN);
    turnEl.setAttribute('aria-label', gameOver
      ? (turn === HUMAN ? 'You win' : `Enemy ${turn - 1} wins`)
      : (turn === HUMAN ? 'Your turn' : `Enemy ${turn - 1} turn`));
    if (gameOver) statusEl.textContent = turn === HUMAN ? 'You win' : `Enemy ${turn - 1} wins`;
    else statusEl.textContent = turn === HUMAN ? 'Your turn' : `Enemy ${turn - 1} turn`;
  }


  async function playMove(start: number, owner: number) {
    const version = gameVersion;
    locked = true;
    moveHistory.push(encodeMove(owner, start));
    entered[owner] = 1;

    // Aggregate pending atoms per cell. A cascade wave is therefore O(board size)
    // instead of O(number of atoms), so edge/corner explosions cannot grow an
    // unbounded JS queue during large reactions.
    let pending = new Uint32Array(board.length);
    pending[start] = 1;
    // Chip-firing on this closed grid has no sink, so some high-density states
    // can cycle forever. Only start tracking states after the cascade has a
    // sole winner; normal multi-player cascades pay no signature cost.
    const winningStates = new Set<string>();

    while (!gameOver) {
      const next = new Uint32Array(board.length);
      const transfers = [];
      let anyPending = false;

      for (let i = 0; i < pending.length; i++) {
        const incoming = pending[i];
        if (!incoming) continue;
        anyPending = true;

        const total = board[i] + incoming;
        const d = degree[i];
        const bursts = Math.floor(total / d);
        const remainder = total - bursts * d;
        board[i] = remainder;
        owners[i] = remainder ? owner : EMPTY;

        if (!bursts) continue;
        for (const n of neighbors[i]) {
          next[n] += bursts;
          // One visual orb per direction is enough to communicate the wave.
          // The simulation itself still propagates every atom via the count.
          transfers.push({from:i,to:n,owner,start:performance.now(),duration:105});
        }
      }

      if (!anyPending) break;
      requestDraw();

      // Always materialize the next wave before deciding the winner. Otherwise a
      // final explosion can eliminate the last opponent and finish the game while
      // its outgoing atoms still exist only in `next`, dropping them from the
      // displayed and persisted winning board.
      let hasNext = false;
      for (let i = 0; i < next.length; i++) if (next[i]) { hasNext = true; break; }
      if (!hasNext) break;

      const winNow = liveWinner(owner, next);
      if (winNow) {
        const signature = `${bytesToB64(board)}:${bytesToB64(new Uint8Array(next.buffer))}`;
        if (winningStates.has(signature)) { finishGame(winNow); return; }
        winningStates.add(signature);
      }

      if (transfers.length) {
        particles = transfers;
        await new Promise(resolve => setTimeout(resolve, 82));
        if (version !== gameVersion) return;
      }
      pending = next;
    }

    particles = [];
    const win = liveWinner();
    if (win) { finishGame(win); return; }
    locked = false;
    turn = nextPlayer(owner);
    updateStatus();
    saveGameState(true);
    requestDraw();
    if (pendingPage) {
      const page = pendingPage;
      pendingPage = null;
      if (page === PAGE_STATS) showStats(false);
      else showMenu(false);
    }
  }

  function legalMoves(owner: number): number[] {
    const out: number[] = [];
    for (let i = 0; i < board.length; i++) if (board[i] === 0 || owners[i] === owner) out.push(i);
    return out;
  }

  function hasCells(owner: number) {
    for (let i = 0; i < owners.length; i++) if (owners[i] === owner) return true;
    return false;
  }

  function nextPlayer(owner: number) {
    for (let step = 1; step <= playerCount; step++) {
      const candidate = ((owner - 1 + step) % playerCount) + 1;
      if (!entered[candidate] || hasCells(candidate)) return candidate;
    }
    return HUMAN;
  }

  async function continueTurns() {
    const version = gameVersion;
    while (version === gameVersion && !gameOver && turn !== HUMAN && !locked) {
      const player = turn;
      const moves = legalMoves(player);
      if (!moves.length) { entered[player] = 1; turn = nextPlayer(player); saveGameState(true); continue; }
      const botSettings = gamePlayers[player - 1]?.bot?.settings || {};
      const thinkMin = Math.max(0, Number(botSettings.thinkMinMs) || 65);
      const thinkMax = Math.max(thinkMin, Number(botSettings.thinkMaxMs) || 135);
      await new Promise(resolve => setTimeout(resolve, thinkMin + Math.random() * (thinkMax - thinkMin)));
      if (version !== gameVersion || gameOver || turn !== player || locked) return;
      const idx = moves[(Math.random() * moves.length) | 0];
      await playMove(idx, player);
    }
  }

  async function humanMove(i: number) {
    if (locked || gameOver || turn !== HUMAN) return;
    if (board[i] !== 0 && owners[i] !== HUMAN) {
      canvas.animate([{transform:'translateX(0)'},{transform:'translateX(-2px)'},{transform:'translateX(2px)'},{transform:'translateX(0)'}], {duration:95});
      return;
    }
    await playMove(i, HUMAN);
    continueTurns();
  }

  function cellFromEvent(e: PointerEvent) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left - ox;
    const y = e.clientY - rect.top - oy;
    if (x < 0 || y < 0 || x >= cols * cell || y >= rows * cell) return -1;
    const c = Math.floor(x / cell), r = Math.floor(y / cell);
    if (c < 0 || c >= cols || r < 0 || r >= rows) return -1;
    return r * cols + c;
  }

  const onCanvasPointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const i = cellFromEvent(e);
    if (i >= 0) { focusCell = i; canvas.focus({preventScroll:true}); requestDraw(); void humanMove(i); }
  };
  const onCanvasKeyDown = (e: KeyboardEvent) => {
    if (gameView.hidden || !board.length) return;
    const row = Math.floor(focusCell / cols), col = focusCell % cols;
    let next = focusCell;
    if (e.key === 'ArrowLeft') next = row * cols + Math.max(0, col - 1);
    else if (e.key === 'ArrowRight') next = row * cols + Math.min(cols - 1, col + 1);
    else if (e.key === 'ArrowUp') next = Math.max(0, row - 1) * cols + col;
    else if (e.key === 'ArrowDown') next = Math.min(rows - 1, row + 1) * cols + col;
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!e.repeat) void humanMove(focusCell); return; }
    else if (e.key === 'Home') next = row * cols;
    else if (e.key === 'End') next = row * cols + cols - 1;
    else return;
    e.preventDefault(); focusCell = next; requestDraw();
  };
  const onCanvasFocus = () => requestDraw();
  const onCanvasBlur = () => requestDraw();
  canvas.addEventListener('pointerdown', onCanvasPointerDown);
  canvas.addEventListener('keydown', onCanvasKeyDown);
  canvas.addEventListener('focus', onCanvasFocus);
  canvas.addEventListener('blur', onCanvasBlur);

  function reset(nextConfig = config) {
    gameVersion++;
    particles = [];
    config = {...nextConfig};
    saveConfig();
    turn = HUMAN;
    locked = false;
    gameOver = false;
    resultRecorded = false;
    moveHistory = [];
    replayComplete = true;
    currentMatchId = newMatchId();
    gamePlayers = createPlayers(config.enemies);
    resultPanel.hidden = true;
    buildBoard();
    focusCell = Math.min(focusCell, Math.max(0, board.length - 1));
    syncSettings();
    updateStatus();
    saveGameState(true);
    layout();
  }

  function restoreGame(saved: SavedGame) {
    config = {...saved.config};
    rows = config.rows;
    cols = config.cols;
    playerCount = config.enemies + 1;
    buildBoard();
    board.set(saved.board);
    owners.set(saved.owners);
    entered.set(saved.entered.subarray(0, entered.length));
    turn = saved.turn;
    gameOver = saved.gameOver;
    resultRecorded = saved.gameOver;
    moveHistory = Array.isArray(saved.moves) ? saved.moves.slice() : [];
    replayComplete = saved.replayComplete === true;
    currentMatchId = saved.matchId || newMatchId();
    gamePlayers = normalizePlayers(saved.players, config.enemies);
    if (!gameOver && entered[turn] && !hasCells(turn)) turn = nextPlayer(turn);
    focusCell = Math.min(focusCell, Math.max(0, board.length - 1));
    locked = false;
    particles = [];
    syncSettings();
    updateStatus();
    syncMatchRecord(gameOver ? 'completed' : 'active', gameOver ? turn : 0);
  }

  function boardSummary(cfg: Config = config) {
    return `${cfg.rows} × ${cfg.cols} board · ${cfg.enemies} ${cfg.enemies === 1 ? 'enemy' : 'enemies'}`;
  }

  function updateResumeCard() {
    const saved = readSavedGame();
    if (!saved) {
      resumeEyebrow.textContent = 'First match';
      resumeTitle.textContent = 'Start playing';
      resumeCopy.textContent = 'Begin with the current board settings.';
      resumeSpec.textContent = boardSummary(config);
      resumeButton.textContent = 'Start game';
      resumeCard.classList.remove('chain-mode-card-primary');
      return;
    }
    resumeCard.classList.add('chain-mode-card-primary');
    resumeEyebrow.textContent = saved.gameOver ? 'Last match' : 'Current game';
    resumeTitle.textContent = saved.gameOver ? (saved.turn === HUMAN ? 'You won' : 'Match complete') : 'Continue';
    resumeCopy.textContent = saved.gameOver ? 'Replay the finished board or start another match.' : 'Resume exactly where the board was left.';
    resumeSpec.textContent = boardSummary(saved.config);
    resumeButton.textContent = saved.gameOver ? 'View board' : 'Continue game';
  }

  let currentView = openingView;
  let viewTransitionsReady = false;

  function showView(to: HTMLElement, commit: () => void, direction: Direction = 'forward') {
    const from = currentView;
    currentView = to;
    if (from === to) {
      commit();
      return;
    }
    if (!viewTransitionsReady) {
      commit();
      from.hidden = true;
      to.hidden = false;
      return;
    }
    void animateMountedViewSwap(from, to, commit, direction);
  }

  function showMenu(syncUrl = true, direction: Direction = 'back') {
    const wasInGame = currentView === gameView;
    if (syncUrl) writePage(PAGE_MENU);
    if (wasInGame && locked) {
      pendingPage = PAGE_MENU;
      statusEl.textContent = 'Finishing cascade before opening the game menu';
      return;
    }
    pendingPage = null;
    const commit = () => {
      if (wasInGame) gameVersion++;
      setSettingsOpen(false);
      resultPanel.hidden = true;
      if (wasInGame || readSavedGame()) saveGameState(false);
      updateResumeCard();
    };
    showView(openingView, commit, direction);
  }

  function showStats(syncUrl = true, direction: Direction = 'forward') {
    const wasInGame = currentView === gameView;
    if (syncUrl) writePage(PAGE_STATS);
    if (wasInGame && locked) {
      pendingPage = PAGE_STATS;
      statusEl.textContent = 'Finishing cascade before opening statistics';
      return;
    }
    pendingPage = null;
    const commit = () => {
      if (wasInGame) saveGameState(false);
      setSettingsOpen(false);
      resultPanel.hidden = true;
      renderStats();
    };
    showView(statsView, commit, direction);
  }

  function showGame(syncUrl = true, requestedDirection: Direction | null = null) {
    const fromStats = currentView === statsView;
    pendingPage = null;
    closeReplay();
    if (syncUrl) writePage(PAGE_GAME);
    const commit = () => {
      saveGameState(true);
      requestAnimationFrame(() => {
        layout();
        updateStatus();
        if (gameOver) showResult();
        else if (turn !== HUMAN) continueTurns();
      });
    };
    showView(gameView, commit, requestedDirection ?? (fromStats ? 'back' : 'forward'));
  }

  function showResult() {
    if (!gameOver || gameView.hidden) return;
    resultTitle.textContent = turn === HUMAN ? 'You win' : `Enemy ${turn - 1} wins`;
    resultCopy.textContent = `${boardSummary()} · The board belongs to ${turn === HUMAN ? 'you' : `enemy ${turn - 1}`}.`;
    const wasHidden = resultPanel.hidden;
    resultPanel.hidden = false;
    if (wasHidden && resultPanel.animate && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      resultPanel.animate(
        [{opacity:0, transform:'translate(-50%,-48%) scale(.97)'},{opacity:1, transform:'translate(-50%,-50%) scale(1)'}],
        {duration:180, easing:'cubic-bezier(.22,1,.36,1)'}
      );
    }
  }

  function startNewGame(nextConfig: Config) {
    abandonCurrentMatch();
    reset(nextConfig);
    showGame();
  }

  function positionSettings() {
    const r = settingsButton.getBoundingClientRect();
    const viewportGap = 8;
    const width = Math.min(settingsPanel.offsetWidth || 360, innerWidth - viewportGap * 2);
    const naturalHeight = Math.min(settingsPanel.scrollHeight || 420, innerHeight - viewportGap * 2);
    const left = Math.max(viewportGap, Math.min(innerWidth - width - viewportGap, r.right - width));
    const below = r.bottom + 6;
    const opensBelow = below + naturalHeight <= innerHeight - viewportGap || r.top < innerHeight - r.bottom;
    const top = opensBelow ? below : Math.max(viewportGap, r.top - naturalHeight - 6);
    const availableHeight = opensBelow ? innerHeight - top - viewportGap : r.top - viewportGap * 2;
    settingsPanel.dataset.side = opensBelow ? 'bottom' : 'top';
    settingsPanel.style.transformOrigin = opensBelow ? 'top right' : 'bottom right';
    settingsPanel.style.left = `${left}px`;
    settingsPanel.style.top = `${top}px`;
    settingsPanel.style.maxHeight = `${Math.max(120, availableHeight)}px`;
  }

  function setSettingsOpen(open: boolean) {
    settingsPanel.dataset.open = String(open);
    settingsPanel.setAttribute('aria-hidden', String(!open));
    settingsButton.setAttribute('aria-expanded', String(open));
    if (open) requestAnimationFrame(positionSettings);
  }

  function syncRangeProgress(input: HTMLInputElement) {
    const min = Number(input.min), max = Number(input.max), value = Number(input.value);
    const ratio = max > min ? Math.max(0, Math.min(1, (value - min) / (max - min))) : 0;
    const shell = input.closest<HTMLElement>('.game-range-shell');
    if (shell) shell.style.setProperty('--range-fill-width', `calc(${ratio * 100}% + ${8 - ratio * 16}px)`);
  }

  function syncSettings() {
    rowsInput.value = String(config.rows);
    colsInput.value = String(config.cols);
    enemiesInput.value = String(config.enemies);
    rowsValue.value = String(config.rows);
    colsValue.value = String(config.cols);
    enemiesValue.value = String(config.enemies);
    for (const input of [rowsInput, colsInput, enemiesInput]) syncRangeProgress(input);
  }

  function settingsFromControls() {
    return {
      rows: clampInt(rowsInput.value, ...limits.rows, defaults.rows),
      cols: clampInt(colsInput.value, ...limits.cols, defaults.cols),
      enemies: clampInt(enemiesInput.value, ...limits.enemies, defaults.enemies),
    };
  }

  function previewSettings() {
    rowsValue.value = rowsInput.value;
    colsValue.value = colsInput.value;
    enemiesValue.value = enemiesInput.value;
    for (const input of [rowsInput, colsInput, enemiesInput]) syncRangeProgress(input);
    const untouched = !locked && !gameOver && board && !board.some(value => value !== 0);
    if (untouched) {
      const next = settingsFromControls();
      if (next.rows !== config.rows || next.cols !== config.cols || next.enemies !== config.enemies) {
        config = next;
        saveConfig();
        gamePlayers = createPlayers(config.enemies);
        buildBoard();
        focusCell = Math.min(focusCell, Math.max(0, board.length - 1));
        updateStatus();
        saveGameState(true);
        updateResumeCard();
        layout();
      }
    }
  }

  settingsButton.addEventListener('click', () => setSettingsOpen(settingsButton.getAttribute('aria-expanded') !== 'true'));
  newGameButton.addEventListener('click', () => { const next = settingsFromControls(); setSettingsOpen(false); startNewGame(next); });
  menuButton.addEventListener('click', () => showMenu());
  resumeButton.addEventListener('click', () => {
    const saved = readSavedGame();
    if (saved) restoreGame(saved); else reset(config);
    showGame();
  });
  quickButton.addEventListener('click', () => startNewGame(defaults));
  presets.forEach(button => button.addEventListener('click', () => startNewGame({
    rows: clampInt(button.dataset.rows, ...limits.rows, defaults.rows),
    cols: clampInt(button.dataset.cols, ...limits.cols, defaults.cols),
    enemies: clampInt(button.dataset.enemies, ...limits.enemies, defaults.enemies),
  })));
  playAgainButton.addEventListener('click', () => startNewGame(config));
  resultMenuButton.addEventListener('click', () => showMenu());
  statsButtons.forEach(button => button.addEventListener('click', () => showStats()));
  statsBackButton.addEventListener('click', () => showMenu());
  replayClose.addEventListener('click', closeReplay);
  replayPrev.addEventListener('click', () => { stopReplay(); setReplayIndex(replayIndex - 1); });
  replayNext.addEventListener('click', () => { stopReplay(); void animateReplayMove(replayIndex + 1); });
  replayPlay.addEventListener('click', () => { void toggleReplay(); });
  replayResume.addEventListener('click', resumeReplayPoint);
  settingsPanel.addEventListener('pointerdown', e => e.stopPropagation());
  const onDocumentPointerDown = (e: PointerEvent) => {
    const target = e.target instanceof Node ? e.target : null;
    if (target && settingsButton.getAttribute('aria-expanded') === 'true' && !settingsPanel.contains(target) && !settingsButton.contains(target)) setSettingsOpen(false);
  };
  document.addEventListener('pointerdown', onDocumentPointerDown);
  for (const input of [rowsInput, colsInput, enemiesInput]) input.addEventListener('input', previewSettings);
  const onDocumentKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') setSettingsOpen(false); };
  document.addEventListener('keydown', onDocumentKeyDown);

  const savedGame = readSavedGame();
  if (savedGame) restoreGame(savedGame); else { buildBoard(); syncSettings(); updateStatus(); }
  updateResumeCard();
  const onPopState = () => {
    const page = pageFromLocation();
    const nextIndex = typeof history.state?.chainPageIndex === 'number' ? history.state.chainPageIndex : null;
    const direction = nextIndex != null && nextIndex < pageHistoryIndex ? 'back' : 'forward';
    if (nextIndex != null) pageHistoryIndex = nextIndex;
    if (page === PAGE_STATS) showStats(false, direction);
    else if (page === PAGE_GAME) showGame(false, direction);
    else showMenu(false, direction);
  };
  if (typeof history.state?.chainPageIndex !== 'number')
    history.replaceState({...(history.state || {}), chainPage: pageFromLocation(), chainPageIndex: pageHistoryIndex}, '', location.href);
  addEventListener('popstate', onPopState);
  const repaintTheme = () => { orbCache.clear(); updateStatus(); requestDraw(); drawReplay(); };
  const positionSettingsOnResize = () => { if (settingsButton.getAttribute('aria-expanded') === 'true') positionSettings(); drawReplay(); };
  addEventListener('resize', positionSettingsOnResize, {passive:true});
  const resizeObserver = new ResizeObserver(() => { if (!gameView.hidden) layout(); });
  resizeObserver.observe(stage);
  window.addEventListener('samey-themechange', repaintTheme);
  const themeObserver = new MutationObserver(repaintTheme);
  themeObserver.observe(document.documentElement, {attributes:true, attributeFilter:['data-kb-theme','style']});
  const scheme = window.matchMedia('(prefers-color-scheme: dark)');
  scheme.addEventListener('change', repaintTheme);
  const initialPage = pageFromLocation();
  if (initialPage === PAGE_STATS) showStats(false);
  else if (initialPage === PAGE_GAME) showGame(false);
  else showMenu(false);
  viewTransitionsReady = true;

  return () => {
    gameVersion++;
    stopReplay();
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    particles = [];
    pendingPage = null;
    removeEventListener('resize', positionSettingsOnResize);
    removeEventListener('popstate', onPopState);
    resizeObserver.disconnect();
    themeObserver.disconnect();
    window.removeEventListener('samey-themechange', repaintTheme);
    scheme.removeEventListener('change', repaintTheme);
    document.removeEventListener('pointerdown', onDocumentPointerDown);
    document.removeEventListener('keydown', onDocumentKeyDown);
    colorProbe.remove();
    canvas.removeEventListener('pointerdown', onCanvasPointerDown);
    canvas.removeEventListener('keydown', onCanvasKeyDown);
    canvas.removeEventListener('focus', onCanvasFocus);
    canvas.removeEventListener('blur', onCanvasBlur);
  };
}
