// @ts-nocheck
import { animateMountedViewSwap } from '../../shared/transitions.ts';
export function mountChain() {
  'use strict';

  const canvas = document.getElementById('chain-canvas');
  const stage = document.getElementById('chain-stage');
  const statusEl = document.getElementById('chain-status');
  const turnEl = document.getElementById('chain-turn');
  const youSwatch = document.getElementById('chain-you-swatch');
  const activeSwatch = document.getElementById('chain-active-swatch');
  const settingsButton = document.getElementById('chain-settings-button');
  const settingsPanel = document.getElementById('chain-settings');
  const newGameButton = document.getElementById('chain-new-game');
  const rowsInput = document.getElementById('chain-rows');
  const colsInput = document.getElementById('chain-cols');
  const enemiesInput = document.getElementById('chain-enemies');
  const rowsValue = document.getElementById('chain-rows-value');
  const colsValue = document.getElementById('chain-cols-value');
  const enemiesValue = document.getElementById('chain-enemies-value');
  const openingView = document.getElementById('chain-opening');
  const gameView = document.getElementById('chain-game');
  const menuButton = document.getElementById('chain-menu-button');
  const resumeCard = document.getElementById('chain-resume-card');
  const resumeButton = document.getElementById('chain-resume');
  const resumeEyebrow = document.getElementById('chain-resume-eyebrow');
  const resumeTitle = document.getElementById('chain-resume-title');
  const resumeCopy = document.getElementById('chain-resume-copy');
  const resumeSpec = document.getElementById('chain-resume-spec');
  const quickButton = document.getElementById('chain-quick');
  const resultPanel = document.getElementById('chain-result');
  const resultTitle = document.getElementById('chain-result-title');
  const resultCopy = document.getElementById('chain-result-copy');
  const playAgainButton = document.getElementById('chain-play-again');
  const resultMenuButton = document.getElementById('chain-result-menu');
  const statsButton = document.getElementById('chain-stats-button');
  const statsBackButton = document.getElementById('chain-stats-back');
  const statsView = document.getElementById('chain-stats');
  const statGames = document.getElementById('chain-stat-games');
  const statWins = document.getElementById('chain-stat-wins');
  const statRate = document.getElementById('chain-stat-rate');
  const statLargest = document.getElementById('chain-stat-largest');
  const statRecent = document.getElementById('chain-stat-recent');
  if (!canvas || !stage || !statusEl || !turnEl || !youSwatch || !activeSwatch || !settingsButton || !settingsPanel || !newGameButton || !rowsInput || !colsInput || !enemiesInput || !rowsValue || !colsValue || !enemiesValue || !openingView || !gameView || !menuButton || !resumeCard || !resumeButton || !resumeEyebrow || !resumeTitle || !resumeCopy || !resumeSpec || !quickButton || !resultPanel || !resultTitle || !resultCopy || !playAgainButton || !resultMenuButton || !statsButton || !statsBackButton || !statsView || !statGames || !statWins || !statRate || !statLargest || !statRecent) return () => {};
  const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
  if (!ctx) return () => {};

  const EMPTY = 0;
  const HUMAN = 1;
  const PLAYER_COLORS = ['', '#6aaa64', '#c95d63', '#6b8fd6', '#b07aa1', '#d2a94b', '#62a8a8'];
  const limits = { rows: [4, 30], cols: [4, 30], enemies: [1, 5] };
  const defaults = { rows: 9, cols: 6, enemies: 1 };
  const GAME_KEY = 'samey.chain.game.v2';
  const STATS_KEY = 'samey.chain.stats.v1';
  const PAGE_QUERY = 'p';
  const PAGE_MENU = 'menu';
  const PAGE_GAME = 'game';
  const PAGE_STATS = 'stats';
  let config = loadConfig();
  let rows = config.rows;
  let cols = config.cols;
  let playerCount = config.enemies + 1;
  let board, owners, degree, neighbors, entered;
  let turn = HUMAN;
  let locked = false;
  let gameOver = false;
  let cssW = 0, cssH = 0, cell = 0, ox = 0, oy = 0, dpr = 1;
  let frame = 0;
  let focusCell = 0;
  let particles = [];
  let gameVersion = 0;
  let pendingPage = null;
  let resultRecorded = false;
  const orbCache = new Map();

  function pageFromLocation() {
    const value = new URL(location.href).searchParams.get(PAGE_QUERY);
    return value === PAGE_GAME || value === PAGE_STATS ? value : PAGE_MENU;
  }

  function writePage(page, replace = false) {
    const url = new URL(location.href);
    if (page === PAGE_MENU) url.searchParams.delete(PAGE_QUERY);
    else url.searchParams.set(PAGE_QUERY, page);
    if (url.href === location.href) return;
    history[replace ? 'replaceState' : 'pushState']({...(history.state || {}), chainPage: page}, '', url);
  }

  function clampInt(value, min, max, fallback) {
    const n = Number.parseInt(value, 10);
    return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
  }

  function loadConfig() {
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

  function bytesToB64(bytes) {
    let out = '';
    for (let i = 0; i < bytes.length; i += 0x8000) out += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(out);
  }

  function b64ToBytes(text, expected) {
    try {
      const raw = atob(text || '');
      if (raw.length !== expected) return null;
      const out = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
      return out;
    } catch { return null; }
  }

  function readSavedGame() {
    try {
      const saved = JSON.parse(localStorage.getItem(GAME_KEY) || 'null');
      if (!saved || saved.v !== 2) return null;
      const readInt = (value, [min, max]) => {
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
        if (sole) sole = -1;
        else sole = player;
      }
      if (allEntered && sole === EMPTY) return null;
      let gameOver = saved.g === true;
      if (gameOver) {
        if (!allEntered || sole <= EMPTY || savedTurn !== sole) return null;
      } else if (allEntered && sole > EMPTY) {
        // A valid stable board with one remaining player is necessarily over.
        // Repair older/interrupted saves that reached the final board before the
        // game-over flag was persisted.
        gameOver = true;
        savedTurn = sole;
      }
      if (saved.i !== true && saved.i !== false) return null;
      return {config: cfg, board: b, owners: o, entered: enteredSaved, turn: savedTurn, gameOver, inGame: saved.i};
    } catch { return null; }
  }

  function saveGameState(inGame = !gameView.hidden) {
    if (!board || !owners || !entered) return;
    try {
      localStorage.setItem(GAME_KEY, JSON.stringify({
        v:2,r:config.rows,c:config.cols,e:config.enemies,
        b:bytesToB64(board),o:bytesToB64(owners),p:bytesToB64(entered),
        t:turn,g:gameOver,i:inGame
      }));
    } catch {}
    updateResumeCard();
  renderStats();
  }

  function loadStats() {
    try {
      const value = JSON.parse(localStorage.getItem(STATS_KEY) || 'null');
      if (!value || typeof value !== 'object') throw 0;
      return {games: Math.max(0, Number(value.games) || 0), wins: Math.max(0, Number(value.wins) || 0), largest: Math.max(0, Number(value.largest) || 0), recent: Array.isArray(value.recent) ? value.recent.slice(0, 30) : []};
    } catch { return {games:0,wins:0,largest:0,recent:[]}; }
  }

  function recordResult(winner) {
    if (resultRecorded) return;
    resultRecorded = true;
    const stats = loadStats();
    stats.games++;
    if (winner === HUMAN) stats.wins++;
    stats.largest = Math.max(stats.largest, config.rows * config.cols);
    stats.recent.unshift({t:Date.now(),w:winner===HUMAN,r:config.rows,c:config.cols,e:config.enemies});
    stats.recent = stats.recent.slice(0,30);
    try { localStorage.setItem(STATS_KEY, JSON.stringify(stats)); } catch {}
    renderStats();
  }

  function renderStats() {
    const stats = loadStats();
    statGames.textContent = String(stats.games);
    statWins.textContent = String(stats.wins);
    statRate.textContent = stats.games ? `${(stats.wins / stats.games * 100).toFixed(1)}%` : '–';
    statLargest.textContent = stats.largest ? `${stats.largest} cells` : '–';
    if (!stats.recent.length) { statRecent.innerHTML = '<div class="chain-stat-empty">No completed matches yet.</div>'; return; }
    statRecent.innerHTML = stats.recent.map(entry => `<div class="chain-stat-row"><span>${entry.r} × ${entry.c} · ${entry.e} ${entry.e===1?'enemy':'enemies'}</span><strong data-win="${entry.w}">${entry.w?'WIN':'LOSS'}</strong><time>${new Date(entry.t).toLocaleDateString()}</time></div>`).join('');
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
  const color = (name, fallback) => css().getPropertyValue(name).trim() || fallback;
  const playerColor = player => PLAYER_COLORS[player] || `hsl(${(player * 67) % 360} 72% 54%)`;

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

  function center(i) {
    return [ox + (i % cols + .5) * cell, oy + (Math.floor(i / cols) + .5) * cell];
  }

  function atomOffsets(n, radius) {
    if (n <= 1) return [[0,0]];
    if (n === 2) return [[-radius*.36,0],[radius*.36,0]];
    if (n === 3) return [[0,-radius*.39],[-radius*.36,radius*.28],[radius*.36,radius*.28]];
    return [[-radius*.32,-radius*.32],[radius*.32,-radius*.32],[-radius*.32,radius*.32],[radius*.32,radius*.32]];
  }

  function mixHex(a, b, t) {
    const n = hex => [1,3,5].map(i => Number.parseInt(hex.slice(i, i + 2), 16));
    const [ar,ag,ab] = n(a), [br,bg,bb] = n(b);
    const c = (x,y) => Math.round(x + (y - x) * t).toString(16).padStart(2, '0');
    return `#${c(ar,br)}${c(ag,bg)}${c(ab,bb)}`;
  }

  function orbSprite(owner, radius) {
    const base = playerColor(owner);
    const key = `${owner}:${radius.toFixed(2)}:${dpr}`;
    let sprite = orbCache.get(key);
    if (sprite) return sprite;
    const pad = 3, size = Math.ceil(radius * 2 + pad * 2);
    sprite = document.createElement('canvas');
    sprite.width = Math.ceil(size * dpr);
    sprite.height = Math.ceil(size * dpr);
    const g = sprite.getContext('2d');
    g.scale(dpr, dpr);
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';
    const c = size / 2;
    const gradient = g.createRadialGradient(c - radius*.34, c - radius*.38, radius*.08, c, c, radius*1.04);
    gradient.addColorStop(0, mixHex(base, '#ffffff', .55));
    gradient.addColorStop(.32, mixHex(base, '#ffffff', .16));
    gradient.addColorStop(.74, base);
    gradient.addColorStop(1, mixHex(base, '#000000', .30));
    g.shadowColor = 'rgba(0,0,0,.18)';
    g.shadowBlur = Math.max(1.5, radius * .22);
    g.shadowOffsetY = Math.max(.5, radius * .08);
    g.fillStyle = gradient;
    g.beginPath(); g.arc(c, c, radius, 0, Math.PI * 2); g.fill();
    g.shadowColor = 'transparent';
    g.strokeStyle = mixHex(base, '#000000', .18);
    g.lineWidth = Math.max(.65, radius * .07);
    g.stroke();
    orbCache.set(key, sprite);
    return sprite;
  }

  function drawOrb(x, y, owner, radius, alpha = 1) {
    const sprite = orbSprite(owner, radius);
    const w = sprite.width / dpr, h = sprite.height / dpr;
    const old = ctx.globalAlpha;
    ctx.globalAlpha = alpha;
    ctx.drawImage(sprite, x - w/2, y - h/2, w, h);
    ctx.globalAlpha = old;
  }

  function draw(now) {
    frame = 0;
    const boardBg = color('--site-soft', '#f3f4f5');
    const line = color('--site-line', '#d3d6da');
    ctx.fillStyle = boardBg;
    ctx.fillRect(0, 0, cssW, cssH);
    ctx.lineWidth = 1;
    ctx.strokeStyle = line;
    ctx.beginPath();
    for (let c = 0; c <= cols; c++) { const x = ox + c * cell; ctx.moveTo(x, oy); ctx.lineTo(x, oy + rows * cell); }
    for (let r = 0; r <= rows; r++) { const y = oy + r * cell; ctx.moveTo(ox, y); ctx.lineTo(ox + cols * cell, y); }
    ctx.stroke();

    const atomR = Math.max(3.8, Math.min(11, cell * .135));
    for (let i = 0; i < board.length; i++) {
      const count = board[i]; if (!count) continue;
      const [cx, cy] = center(i);
      for (const [dx,dy] of atomOffsets(count, atomR)) drawOrb(cx + dx, cy + dy, owners[i], atomR);
    }

    if (!gameOver && document.activeElement === canvas && focusCell >= 0 && focusCell < board.length) {
      const [fx, fy] = center(focusCell);
      ctx.save();
      ctx.strokeStyle = color('--site-accent', '#6aaa64');
      ctx.lineWidth = 2;
      ctx.strokeRect(fx - cell / 2 + 2, fy - cell / 2 + 2, Math.max(0, cell - 4), Math.max(0, cell - 4));
      ctx.restore();
    }

    if (particles.length) {
      let alive = false;
      for (const p of particles) {
        const t = Math.min(1, (now - p.start) / p.duration);
        if (t < 1) alive = true;
        const e = 1 - (1 - t) * (1 - t);
        const x = p.x0 + (p.x1 - p.x0) * e;
        const y = p.y0 + (p.y1 - p.y0) * e;
        drawOrb(x, y, p.owner, atomR, 1 - t * .12);
      }
      ctx.globalAlpha = 1;
      if (alive) requestDraw(); else particles = [];
    }

  }

  function requestDraw() { if (!frame) frame = requestAnimationFrame(draw); }

  function allPlayersEntered() {
    for (let player = 1; player <= playerCount; player++) if (!entered[player]) return false;
    return true;
  }

  function liveWinner(pendingOwner = EMPTY, pending = null) {
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

  function finishGame(win) {
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


  async function playMove(start, owner) {
    const version = gameVersion;
    locked = true;
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
        const [x0, y0] = center(i);
        for (const n of neighbors[i]) {
          next[n] += bursts;
          // One visual orb per direction is enough to communicate the wave.
          // The simulation itself still propagates every atom via the count.
          const [x1, y1] = center(n);
          transfers.push({x0,y0,x1,y1,owner,start:performance.now(),duration:105});
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

  function legalMoves(owner) {
    const out = [];
    for (let i = 0; i < board.length; i++) if (board[i] === 0 || owners[i] === owner) out.push(i);
    return out;
  }

  function hasCells(owner) {
    for (let i = 0; i < owners.length; i++) if (owners[i] === owner) return true;
    return false;
  }

  function nextPlayer(owner) {
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
      await new Promise(resolve => setTimeout(resolve, 65 + Math.random() * 70));
      if (version !== gameVersion || gameOver || turn !== player || locked) return;
      const idx = moves[(Math.random() * moves.length) | 0];
      await playMove(idx, player);
    }
  }

  async function humanMove(i) {
    if (locked || gameOver || turn !== HUMAN) return;
    if (board[i] !== 0 && owners[i] !== HUMAN) {
      canvas.animate([{transform:'translateX(0)'},{transform:'translateX(-2px)'},{transform:'translateX(2px)'},{transform:'translateX(0)'}], {duration:95});
      return;
    }
    await playMove(i, HUMAN);
    continueTurns();
  }

  function cellFromEvent(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left - ox;
    const y = e.clientY - rect.top - oy;
    if (x < 0 || y < 0 || x >= cols * cell || y >= rows * cell) return -1;
    const c = Math.floor(x / cell), r = Math.floor(y / cell);
    if (c < 0 || c >= cols || r < 0 || r >= rows) return -1;
    return r * cols + c;
  }

  const onCanvasPointerDown = e => {
    if (e.button !== 0) return;
    e.preventDefault();
    const i = cellFromEvent(e);
    if (i >= 0) { focusCell = i; canvas.focus({preventScroll:true}); requestDraw(); void humanMove(i); }
  };
  const onCanvasKeyDown = e => {
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
    resultPanel.hidden = true;
    buildBoard();
    focusCell = Math.min(focusCell, Math.max(0, board.length - 1));
    syncSettings();
    updateStatus();
    saveGameState(true);
    layout();
  }

  function restoreGame(saved) {
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
    if (!gameOver && entered[turn] && !hasCells(turn)) turn = nextPlayer(turn);
    focusCell = Math.min(focusCell, Math.max(0, board.length - 1));
    locked = false;
    particles = [];
    syncSettings();
    updateStatus();
  }

  function boardSummary(cfg = config) {
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

  function showMenu(syncUrl = true) {
    const wasInGame = !gameView.hidden;
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
      statsView.hidden = true;
      if (wasInGame || readSavedGame()) saveGameState(false);
      updateResumeCard();
    };
    if (wasInGame) {
      void animateMountedViewSwap(gameView, openingView, commit, 'back');
    } else {
      commit();
      gameView.hidden = true;
      openingView.hidden = false;
    }
  }

  function showStats(syncUrl = true) {
    if (syncUrl) writePage(PAGE_STATS);
    if (!gameView.hidden && locked) {
      pendingPage = PAGE_STATS;
      statusEl.textContent = 'Finishing cascade before opening statistics';
      return;
    }
    pendingPage = null;
    if (!gameView.hidden) saveGameState(false);
    setSettingsOpen(false);
    resultPanel.hidden = true;
    openingView.hidden = true;
    gameView.hidden = true;
    statsView.hidden = false;
    renderStats();
  }

  function showGame(syncUrl = true) {
    pendingPage = null;
    if (syncUrl) writePage(PAGE_GAME);
    statsView.hidden = true;
    const wasInMenu = !openingView.hidden;
    const commit = () => {
      saveGameState(true);
      requestAnimationFrame(() => {
        layout();
        updateStatus();
        if (gameOver) showResult();
        else if (turn !== HUMAN) continueTurns();
      });
    };
    if (wasInMenu) {
      void animateMountedViewSwap(openingView, gameView, commit, 'forward');
    } else {
      openingView.hidden = true;
      gameView.hidden = false;
      commit();
    }
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

  function startNewGame(nextConfig) {
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

  function setSettingsOpen(open) {
    settingsPanel.dataset.open = String(open);
    settingsPanel.setAttribute('aria-hidden', String(!open));
    settingsButton.setAttribute('aria-expanded', String(open));
    if (open) requestAnimationFrame(positionSettings);
  }

  function syncRangeProgress(input) {
    const min = Number(input.min), max = Number(input.max), value = Number(input.value);
    const ratio = max > min ? (value - min) / (max - min) : 0;
    const width = input.getBoundingClientRect().width || input.clientWidth || 0;
    const endpoint = width > 16 ? 8 + ratio * (width - 16) : ratio * width;
    const shell = input.closest('.game-range-shell');
    if (shell) shell.style.setProperty('--range-fill-width', `${Math.min(width, endpoint)}px`);
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
  }

  settingsButton.addEventListener('click', () => setSettingsOpen(settingsButton.getAttribute('aria-expanded') !== 'true'));
  newGameButton.addEventListener('click', () => { const next = settingsFromControls(); setSettingsOpen(false); startNewGame(next); });
  menuButton.addEventListener('click', showMenu);
  resumeButton.addEventListener('click', () => {
    const saved = readSavedGame();
    if (saved) restoreGame(saved); else reset(config);
    showGame();
  });
  quickButton.addEventListener('click', () => startNewGame(defaults));
  document.querySelectorAll('.chain-preset').forEach(button => button.addEventListener('click', () => startNewGame({
    rows: clampInt(button.dataset.rows, ...limits.rows, defaults.rows),
    cols: clampInt(button.dataset.cols, ...limits.cols, defaults.cols),
    enemies: clampInt(button.dataset.enemies, ...limits.enemies, defaults.enemies),
  })));
  playAgainButton.addEventListener('click', () => startNewGame(config));
  resultMenuButton.addEventListener('click', showMenu);
  statsButton.addEventListener('click', showStats);
  statsBackButton.addEventListener('click', showMenu);
  settingsPanel.addEventListener('pointerdown', e => e.stopPropagation());
  const onDocumentPointerDown = e => {
    if (settingsButton.getAttribute('aria-expanded') === 'true' && !settingsPanel.contains(e.target) && !settingsButton.contains(e.target)) setSettingsOpen(false);
  };
  document.addEventListener('pointerdown', onDocumentPointerDown);
  for (const input of [rowsInput, colsInput, enemiesInput]) input.addEventListener('input', previewSettings);
  const onDocumentKeyDown = e => { if (e.key === 'Escape') setSettingsOpen(false); };
  document.addEventListener('keydown', onDocumentKeyDown);

  const savedGame = readSavedGame();
  if (savedGame) restoreGame(savedGame); else { buildBoard(); syncSettings(); updateStatus(); }
  updateResumeCard();
  const onPopState = () => {
    const page = pageFromLocation();
    if (page === PAGE_STATS) showStats(false);
    else if (page === PAGE_GAME) showGame(false);
    else showMenu(false);
  };
  addEventListener('popstate', onPopState);
  const repaintTheme = () => { orbCache.clear(); updateStatus(); requestDraw(); };
  const positionSettingsOnResize = () => { if (settingsButton.getAttribute('aria-expanded') === 'true') positionSettings(); };
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

  return () => {
    gameVersion++;
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
    canvas.removeEventListener('pointerdown', onCanvasPointerDown);
    canvas.removeEventListener('keydown', onCanvasKeyDown);
    canvas.removeEventListener('focus', onCanvasFocus);
    canvas.removeEventListener('blur', onCanvasBlur);
  };
}
