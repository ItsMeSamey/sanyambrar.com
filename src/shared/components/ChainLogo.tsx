import { onCleanup, onMount } from 'solid-js';

const RED = '#cf6469';
const BLUE = '#6e86c8';
const GRID = '#242424';
const TEXT = '#eeeeea';
const BACKGROUND = '#050505';
const DIRS = [[-1, 0], [0, 1], [1, 0], [0, -1]] as const;

const FONT4 = {
  A: ['010', '101', '111', '101'],
  C: ['111', '100', '100', '111'],
  E: ['111', '110', '100', '111'],
  H: ['101', '101', '111', '101'],
  I: ['111', '010', '010', '111'],
  N: ['1001', '1101', '1011', '1001'],
  O: ['111', '101', '101', '111'],
  R: ['110', '101', '110', '101'],
  T: ['111', '010', '010', '010'],
} as const;

type PixelLetter = keyof typeof FONT4;
type Flight = { source: number; dest: number; owner: 1 | 2; span: number };

function makeBitmap(text = 'CHAIN REACTION', charGap = 1, wordGap = 2) {
  const rows: number[][] = Array.from({ length: 4 }, () => []);
  const chars = [...text];
  chars.forEach((character, index) => {
    if (character === ' ') {
      const extra = Math.max(0, wordGap - charGap);
      for (const row of rows) for (let i = 0; i < extra; i++) row.push(0);
      return;
    }
    const glyph = FONT4[character as PixelLetter];
    if (!glyph) return;
    glyph.forEach((line, y) => {
      for (const bit of line) rows[y].push(bit === '1' ? 1 : 0);
      if (index < chars.length - 1) for (let i = 0; i < charGap; i++) rows[y].push(0);
    });
  });
  return rows;
}

const LOGO_ROWS = makeBitmap();
const LOGO_HEIGHT = LOGO_ROWS.length;
const LOGO_WIDTH = LOGO_ROWS[0]?.length ?? 1;
const LOGO_MASK = new Uint8Array(LOGO_WIDTH * LOGO_HEIGHT);
for (let row = 0; row < LOGO_HEIGHT; row++) {
  for (let col = 0; col < LOGO_WIDTH; col++) LOGO_MASK[row * LOGO_WIDTH + col] = LOGO_ROWS[row]?.[col] ?? 0;
}

function createLogoController(canvas: HTMLCanvasElement) {
  const maybeContext = canvas.getContext('2d', { alpha: false, desynchronized: true });
  if (!maybeContext) return () => {};
  const context: CanvasRenderingContext2D = maybeContext;

  const boardLayer = document.createElement('canvas');
  const maybeBoardContext = boardLayer.getContext('2d', { alpha: false });
  if (!maybeBoardContext) return () => {};
  const boardContext: CanvasRenderingContext2D = maybeBoardContext;

  const count = LOGO_WIDTH * LOGO_HEIGHT;
  const owners = new Uint8Array(count);
  const atoms = new Uint8Array(count);
  const thresholds = new Uint8Array(count);
  const routes = new Int16Array(count * 4).fill(-1);
  const spans = new Uint8Array(count * 4);
  let cssWidth = 1;
  let cssHeight = 1;
  let dpr = 1;
  let stopped = false;
  let visible = true;
  let pageVisible = !document.hidden;
  let animationFrame = 0;
  let timeout = 0;
  let generation = 0;

  for (let index = 0; index < count; index++) {
    if (LOGO_MASK[index]) continue;
    const sourceRow = Math.floor(index / LOGO_WIDTH);
    const sourceCol = index % LOGO_WIDTH;
    for (let direction = 0; direction < DIRS.length; direction++) {
      const [dr, dc] = DIRS[direction];
      let row = sourceRow + dr;
      let col = sourceCol + dc;
      let span = 0;
      while (row >= 0 && row < LOGO_HEIGHT && col >= 0 && col < LOGO_WIDTH) {
        span++;
        const target = row * LOGO_WIDTH + col;
        if (!LOGO_MASK[target]) {
          routes[index * 4 + direction] = target;
          spans[index * 4 + direction] = span;
          thresholds[index]++;
          break;
        }
        row += dr;
        col += dc;
      }
    }
  }

  const isActive = () => visible && pageVisible && !stopped;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

  function paintBoardLayer() {
    boardContext.setTransform(dpr, 0, 0, dpr, 0, 0);
    boardContext.fillStyle = BACKGROUND;
    boardContext.fillRect(0, 0, cssWidth, cssHeight);
    const cellWidth = cssWidth / LOGO_WIDTH;
    const cellHeight = cssHeight / LOGO_HEIGHT;
    const gap = Math.max(0.45, Math.min(cellWidth, cellHeight) * 0.085);
    for (let index = 0; index < count; index++) {
      const row = Math.floor(index / LOGO_WIDTH);
      const col = index % LOGO_WIDTH;
      const x = col * cellWidth;
      const y = row * cellHeight;
      boardContext.fillStyle = LOGO_MASK[index] ? TEXT : GRID;
      boardContext.fillRect(x, y, Math.max(0.5, cellWidth - gap), Math.max(0.5, cellHeight - gap));
      if (!LOGO_MASK[index]) {
        boardContext.fillStyle = BACKGROUND;
        boardContext.fillRect(x + gap, y + gap, Math.max(0, cellWidth - gap * 2), Math.max(0, cellHeight - gap * 2));
      }
    }
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    cssWidth = Math.max(1, rect.width);
    cssHeight = Math.max(1, rect.height);
    dpr = Math.min(2, Math.max(1, devicePixelRatio || 1));
    const width = Math.max(1, Math.round(cssWidth * dpr));
    const height = Math.max(1, Math.round(cssHeight * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    if (boardLayer.width !== width || boardLayer.height !== height) {
      boardLayer.width = width;
      boardLayer.height = height;
    }
    paintBoardLayer();
    draw();
  }

  function drawOrb(x: number, y: number, radius: number, owner: number) {
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fillStyle = owner === 1 ? RED : BLUE;
    context.fill();
  }

  function drawAtomGroup(index: number, owner: number, atomCount: number, cellWidth: number, cellHeight: number) {
    if (!atomCount) return;
    const row = Math.floor(index / LOGO_WIDTH);
    const col = index % LOGO_WIDTH;
    const cx = (col + 0.5) * cellWidth;
    const cy = (row + 0.5) * cellHeight;
    const radius = Math.max(1.1, Math.min(cellWidth, cellHeight) * 0.29);
    if (atomCount === 1) {
      drawOrb(cx, cy, radius, owner);
      return;
    }
    if (atomCount === 2) {
      drawOrb(cx - radius * 0.54, cy, radius * 0.78, owner);
      drawOrb(cx + radius * 0.54, cy, radius * 0.78, owner);
      return;
    }
    drawOrb(cx, cy - radius * 0.58, radius * 0.7, owner);
    drawOrb(cx - radius * 0.55, cy + radius * 0.42, radius * 0.7, owner);
    drawOrb(cx + radius * 0.55, cy + radius * 0.42, radius * 0.7, owner);
  }

  function draw(flights: Flight[] = [], progress = 0) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.drawImage(boardLayer, 0, 0);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cellWidth = cssWidth / LOGO_WIDTH;
    const cellHeight = cssHeight / LOGO_HEIGHT;

    for (let index = 0; index < count; index++) {
      if (LOGO_MASK[index] || atoms[index] === 0 || atoms[index] >= thresholds[index]) continue;
      drawAtomGroup(index, owners[index], atoms[index], cellWidth, cellHeight);
    }

    if (flights.length) {
      const eased = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      const radius = Math.max(1.1, Math.min(cellWidth, cellHeight) * 0.28);
      for (const flight of flights) {
        const startRow = Math.floor(flight.source / LOGO_WIDTH);
        const startCol = flight.source % LOGO_WIDTH;
        const endRow = Math.floor(flight.dest / LOGO_WIDTH);
        const endCol = flight.dest % LOGO_WIDTH;
        const x0 = (startCol + 0.5) * cellWidth;
        const y0 = (startRow + 0.5) * cellHeight;
        const x1 = (endCol + 0.5) * cellWidth;
        const y1 = (endRow + 0.5) * cellHeight;
        drawOrb(x0 + (x1 - x0) * eased, y0 + (y1 - y0) * eased, radius, flight.owner);
      }
    }
  }

  function sleep(ms: number) {
    return new Promise<void>(resolve => {
      timeout = window.setTimeout(() => {
        timeout = 0;
        resolve();
      }, ms);
    });
  }

  function seed() {
    owners.fill(0);
    atoms.fill(0);
    const candidates: number[] = [];
    for (let index = 0; index < count; index++) {
      if (!LOGO_MASK[index] && thresholds[index] > 1) candidates.push(index);
    }
    for (let placed = 0; placed < Math.min(11, candidates.length); placed++) {
      const pick = Math.floor(Math.random() * candidates.length);
      const index = candidates.splice(pick, 1)[0];
      if (index === undefined) break;
      const owner = (placed % 2 === 0 ? 1 : 2) as 1 | 2;
      owners[index] = owner;
      atoms[index] = Math.max(1, thresholds[index] - 1);
    }
    draw();
  }

  function legalWeight(index: number, owner: 1 | 2) {
    if (LOGO_MASK[index] || thresholds[index] < 1 || (owners[index] && owners[index] !== owner)) return 0;
    let weight = 1;
    if (owners[index] === owner) {
      weight += 4;
      if (atoms[index] === thresholds[index] - 1) weight += 20;
      else if (atoms[index] === thresholds[index] - 2) weight += 6;
    } else {
      weight += Math.max(0, 5 - thresholds[index]);
    }
    return weight;
  }

  function choose(owner: 1 | 2) {
    let totalWeight = 0;
    for (let index = 0; index < count; index++) totalWeight += legalWeight(index, owner);
    if (!totalWeight) return -1;
    let target = Math.random() * totalWeight;
    for (let index = 0; index < count; index++) {
      target -= legalWeight(index, owner);
      if (target < 0) return index;
    }
    return -1;
  }

  function animateFlights(flights: Flight[], token: number) {
    if (!flights.length || reducedMotion.matches || !isActive()) {
      draw(flights, 1);
      return Promise.resolve();
    }
    const longest = flights.reduce((max, flight) => Math.max(max, flight.span), 1);
    const duration = Math.min(250, 120 + longest * 18);
    return new Promise<void>(resolve => {
      const start = performance.now();
      const frame = (now: number) => {
        if (stopped || generation !== token || !isActive()) {
          animationFrame = 0;
          draw(flights, 1);
          resolve();
          return;
        }
        const progress = Math.min(1, (now - start) / duration);
        draw(flights, progress);
        if (progress >= 1) {
          animationFrame = 0;
          resolve();
          return;
        }
        animationFrame = requestAnimationFrame(frame);
      };
      animationFrame = requestAnimationFrame(frame);
    });
  }

  async function resolveCascade(initial: number[], owner: 1 | 2, token: number) {
    let wave = [...new Set(initial)];
    for (let guard = 0; wave.length && guard < 256 && !stopped && generation === token; guard++) {
      wave = wave.filter(index => thresholds[index] > 0 && atoms[index] >= thresholds[index]);
      if (!wave.length) break;
      const flights: Flight[] = [];
      for (const source of wave) {
        const threshold = thresholds[source];
        atoms[source] -= threshold;
        owners[source] = atoms[source] ? owner : 0;
        for (let direction = 0; direction < 4; direction++) {
          const routeIndex = source * 4 + direction;
          const dest = routes[routeIndex];
          if (dest >= 0) flights.push({ source, dest, owner, span: spans[routeIndex] || 1 });
        }
      }
      draw();
      await animateFlights(flights, token);
      if (stopped || generation !== token) return;
      for (const flight of flights) {
        owners[flight.dest] = owner;
        atoms[flight.dest]++;
      }
      draw();
      const next: number[] = [];
      const seen = new Uint8Array(count);
      for (const flight of flights) {
        if (!seen[flight.dest] && thresholds[flight.dest] > 0 && atoms[flight.dest] >= thresholds[flight.dest]) {
          seen[flight.dest] = 1;
          next.push(flight.dest);
        }
      }
      for (const source of wave) {
        if (!seen[source] && thresholds[source] > 0 && atoms[source] >= thresholds[source]) {
          seen[source] = 1;
          next.push(source);
        }
      }
      wave = next;
      if (wave.length) await sleep(26);
    }
  }

  async function run() {
    let owner: 1 | 2 = 1;
    while (!stopped) {
      if (!isActive() || reducedMotion.matches) {
        await sleep(220);
        continue;
      }
      const index = choose(owner);
      if (index < 0) {
        seed();
        owner = 1;
        await sleep(180);
        continue;
      }
      const token = generation;
      owners[index] = owner;
      atoms[index]++;
      if (atoms[index] >= thresholds[index]) await resolveCascade([index], owner, token);
      else draw();
      if (stopped || generation !== token) continue;
      owner = owner === 1 ? 2 : 1;
      await sleep(120 + Math.random() * 90);
    }
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  const intersectionObserver = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(entries => {
    visible = entries.some(entry => entry.isIntersecting);
    if (visible) draw();
  }, { rootMargin: '80px' });
  intersectionObserver?.observe(canvas);
  const onVisibility = () => {
    pageVisible = !document.hidden;
    if (pageVisible) draw();
  };
  const onReducedMotion = () => draw();
  document.addEventListener('visibilitychange', onVisibility);
  reducedMotion.addEventListener('change', onReducedMotion);
  resize();
  seed();
  void run();

  return () => {
    stopped = true;
    generation++;
    if (animationFrame) cancelAnimationFrame(animationFrame);
    if (timeout) clearTimeout(timeout);
    resizeObserver.disconnect();
    intersectionObserver?.disconnect();
    document.removeEventListener('visibilitychange', onVisibility);
    reducedMotion.removeEventListener('change', onReducedMotion);
  };
}

export function ChainLiveMark(props: { class?: string }) {
  let canvas!: HTMLCanvasElement;
  let dispose = () => {};
  onMount(() => { dispose = createLogoController(canvas); });
  onCleanup(() => dispose());
  return <span class={`chain-live-mark${props.class ? ` ${props.class}` : ''}`} role="img" aria-label="Chain Reaction">
    <canvas ref={canvas} aria-hidden="true" />
  </span>;
}

const BACK_ROWS = [
  '0010',
  '0100',
  '1000',
  '0100',
] as const;

export function ChainBackMark(props: { class?: string }) {
  const gap = 2;
  const chevronWidth = BACK_ROWS[0].length;
  const width = chevronWidth + gap + LOGO_WIDTH;
  return <span class={`chain-back-mark${props.class ? ` ${props.class}` : ''}`} aria-label="Chain Reaction">
    <svg viewBox={`0 0 ${width} ${LOGO_HEIGHT}`} role="img" aria-hidden="true" preserveAspectRatio="xMinYMid meet">
      <g class="chain-back-chevron">
        {BACK_ROWS.flatMap((row, y) => [...row].map((bit, x) => bit === '1' ? <rect x={x + 0.08} y={y + 0.08} width="0.84" height="0.84" /> : null))}
      </g>
      <g class="chain-back-wordmark" transform={`translate(${chevronWidth + gap} 0)`}>
        {LOGO_ROWS.flatMap((row, y) => row.map((bit, x) => bit ? <rect x={x + 0.08} y={y + 0.08} width="0.84" height="0.84" /> : null))}
      </g>
    </svg>
  </span>;
}
