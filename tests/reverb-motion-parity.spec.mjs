import { test as base, expect } from '@playwright/test';

const test = base.extend({
  page: async ({ page }, use) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => {
      if (response.status() >= 400) errors.push(response.status() + ' ' + response.url());
    });
    page.on('console', message => {
      if (message.type() === 'error') errors.push(message.text());
    });
    await use(page);
    expect(errors, 'Browser runtime and console errors').toEqual([]);
  },
});

test.describe.configure({ mode: 'serial' });

function fastOutSlowInValue(progress) {
  const x = Math.max(0, Math.min(1, progress));
  if (x === 0 || x === 1) return x;
  const sample = (t, a, b) =>
    3 * (1 - t) * (1 - t) * t * a + 3 * (1 - t) * t * t * b + t * t * t;
  const slope = (t, a, b) =>
    3 * (1 - t) * (1 - t) * a + 6 * (1 - t) * t * (b - a) + 3 * t * t * (1 - b);
  let t = x;
  for (let i = 0; i < 5; i++) {
    const d = slope(t, 0.4, 0.2);
    if (Math.abs(d) < 1e-6) break;
    t = Math.max(0, Math.min(1, t - (sample(t, 0.4, 0.2) - x) / d));
  }
  let low = 0;
  let high = 1;
  for (let i = 0; i < 8; i++) {
    const tx = sample(t, 0.4, 0.2);
    if (Math.abs(tx - x) < 1e-6) break;
    if (tx < x) low = t;
    else high = t;
    t = (low + high) * 0.5;
  }
  return sample(t, 0, 1);
}

function invertFastOutSlowIn(value) {
  const target = Math.max(0, Math.min(1, value));
  let low = 0;
  let high = 1;
  for (let i = 0; i < 28; i++) {
    const mid = (low + high) * 0.5;
    if (fastOutSlowInValue(mid) < target) low = mid;
    else high = mid;
  }
  return (low + high) * 0.5;
}

async function visitReverb(page, info) {
  const metadata = info.project.metadata;
  const port = metadata.development ? metadata.sitePort : metadata.port;
  await page.goto(`http://127.0.0.1:${port}/projects/reverb/`, { waitUntil: 'networkidle' });
  return page.getByRole('group', { name: 'Interactive Reverb UI demo' });
}

async function panelState(host) {
  return host.evaluate(element => {
    const root = element.shadowRoot;
    const phone = root?.querySelector('#phone');
    const home = root?.querySelector('#homeScreen');
    const settings = root?.querySelector('#settingsScreen');
    const library = root?.querySelector('#libraryScreen');
    const topbar = library?.querySelector('.topbar');
    if (!(phone instanceof HTMLElement) || !(home instanceof HTMLElement)
      || !(settings instanceof HTMLElement) || !(library instanceof HTMLElement)
      || !(topbar instanceof HTMLElement)) throw new Error('Reverb panel surfaces are unavailable');
    const matrix = new DOMMatrix(getComputedStyle(home).transform);
    return {
      phoneHeight: phone.clientHeight,
      homePercent: phone.clientHeight > 0 ? matrix.m42 / phone.clientHeight * 100 : 0,
      homeActive: home.classList.contains('active'),
      settingsActive: settings.classList.contains('active'),
      settingsVisible: settings.classList.contains('motion-visible'),
      libraryActive: library.classList.contains('active'),
      libraryProgress: Number(library.style.getPropertyValue('--library-progress') || 0),
      libraryOffset: Number.parseFloat(library.style.getPropertyValue('--library-offset-y') || '0'),
      libraryTopbarTransform: getComputedStyle(topbar).transform,
    };
  });
}

async function syntheticMainDrag(host, mode, fraction, release = true) {
  await host.evaluate((element, { mode, fraction, release }) => {
    const root = element.shadowRoot;
    const phone = root?.querySelector('#phone');
    if (!(phone instanceof HTMLElement)) throw new Error('Reverb phone is unavailable');
    const rect = phone.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const startY = mode === 'settings'
      ? rect.top + rect.height * 0.20
      : rect.top + rect.height * 0.80;
    const endY = startY + (mode === 'settings' ? 1 : -1) * rect.height * fraction;
    const pointer = (type, y) => new PointerEvent(type, {
      bubbles: true,
      pointerId: 81,
      pointerType: 'touch',
      isPrimary: true,
      clientX: x,
      clientY: y,
    });
    phone.dispatchEvent(pointer('pointerdown', startY));
    phone.dispatchEvent(pointer('pointermove', endY));
    if (release) phone.dispatchEvent(pointer('pointerup', endY));
  }, { mode, fraction, release });
}

async function closeLibraryFromEdge(host) {
  await host.evaluate(element => {
    const root = element.shadowRoot;
    const phone = root?.querySelector('#phone');
    const library = root?.querySelector('.library-list');
    if (!(phone instanceof HTMLElement) || !(library instanceof HTMLElement))
      throw new Error('Reverb phone/library is unavailable');
    const rect = phone.getBoundingClientRect();
    const startY = rect.top + rect.height * 0.55;
    const endY = startY + Math.max(80, rect.height * 0.12);
    const pointer = (type, y) => new PointerEvent(type, {
      bubbles: true,
      pointerId: 82,
      pointerType: 'touch',
      isPrimary: true,
      clientX: rect.left + 4,
      clientY: y,
    });
    library.dispatchEvent(pointer('pointerdown', startY));
    library.dispatchEvent(pointer('pointermove', endY));
    library.dispatchEvent(pointer('pointerup', endY));
  });
}

async function collectSettingsOpen(host) {
  return host.evaluate(async element => {
    const root = element.shadowRoot;
    const phone = root?.querySelector('#phone');
    const home = root?.querySelector('#homeScreen');
    const button = root?.querySelector('#openSettings');
    if (!(phone instanceof HTMLElement) || !(home instanceof HTMLElement)
      || !(button instanceof HTMLElement)) throw new Error('Reverb Settings motion surfaces are unavailable');
    const startedAt = performance.now();
    const samples = [];
    button.click();
    while (performance.now() - startedAt < 500) {
      await new Promise(requestAnimationFrame);
      const matrix = new DOMMatrix(getComputedStyle(home).transform);
      const progress = phone.clientHeight > 0 ? matrix.m42 / phone.clientHeight : 0;
      samples.push({ elapsed: performance.now() - startedAt, progress });
      if (progress >= 0.999) break;
    }
    return samples;
  });
}

async function collectLibraryOpen(host) {
  return host.evaluate(async element => {
    const root = element.shadowRoot;
    const library = root?.querySelector('#libraryScreen');
    const button = root?.querySelector('#openLibrary');
    const topbar = library?.querySelector('.topbar');
    if (!(library instanceof HTMLElement) || !(button instanceof HTMLElement)
      || !(topbar instanceof HTMLElement)) throw new Error('Reverb Library motion surfaces are unavailable');
    const startedAt = performance.now();
    const samples = [];
    button.click();
    while (performance.now() - startedAt < 500) {
      await new Promise(requestAnimationFrame);
      const progress = Number(library.style.getPropertyValue('--library-progress') || 0);
      samples.push({
        elapsed: performance.now() - startedAt,
        progress,
        offset: Number.parseFloat(library.style.getPropertyValue('--library-offset-y') || '0'),
        topbarTransform: getComputedStyle(topbar).transform,
      });
      if (progress >= 0.999) break;
    }
    return samples;
  });
}

async function collectLibraryEdgeClose(host) {
  return host.evaluate(async element => {
    const root = element.shadowRoot;
    const phone = root?.querySelector('#phone');
    const library = root?.querySelector('.library-list');
    const screen = root?.querySelector('#libraryScreen');
    if (!(phone instanceof HTMLElement) || !(library instanceof HTMLElement)
      || !(screen instanceof HTMLElement)) throw new Error('Reverb Library close surfaces are unavailable');
    const rect = phone.getBoundingClientRect();
    const startY = rect.top + rect.height * 0.55;
    const endY = startY + Math.max(80, rect.height * 0.12);
    const pointer = (type, y) => new PointerEvent(type, {
      bubbles: true,
      pointerId: 82,
      pointerType: 'touch',
      isPrimary: true,
      clientX: rect.left + 4,
      clientY: y,
    });
    const startedAt = performance.now();
    library.dispatchEvent(pointer('pointerdown', startY));
    library.dispatchEvent(pointer('pointermove', endY));
    library.dispatchEvent(pointer('pointerup', endY));
    const samples = [];
    while (performance.now() - startedAt < 500) {
      await new Promise(requestAnimationFrame);
      const progress = Number(screen.style.getPropertyValue('--library-progress') || 0);
      samples.push({ elapsed: performance.now() - startedAt, progress });
      if (progress <= 0.001) break;
    }
    return samples;
  });
}

function expectNativeSettle(samples, direction) {
  expect(samples.length).toBeGreaterThan(1);
  const values = samples.map(sample => sample.progress);
  const hasIntermediate = values.some(value => value > 0.02 && value < 0.98);
  if (!hasIntermediate) {
    const skippedAnimation = samples.some((sample, index) => {
      const previous = samples[index - 1];
      if (!previous) return false;
      const crossed = direction === 'open'
        ? previous.progress <= 0.02 && sample.progress >= 0.98
        : previous.progress >= 0.98 && sample.progress <= 0.02;
      return crossed && sample.elapsed - previous.elapsed >= 160;
    });
    expect(skippedAnimation).toBe(true);
  }
  const terminal = samples.at(-1);
  expect(terminal.elapsed).toBeGreaterThanOrEqual(190);
  expect(terminal.progress).toBeCloseTo(direction === 'open' ? 1 : 0, 2);
}

test('Reverb Settings reveal tracks native 220ms progress and 12% release threshold', async ({ page }, info) => {
  const host = await visitReverb(page, info);
  const opening = await collectSettingsOpen(host);
  expectNativeSettle(opening, 'open');
  await expect(host.locator('#settingsScreen')).toHaveClass(/active/);
  await host.locator('#settingsNav').click();
  await expect.poll(() => panelState(host).then(state => state.settingsVisible)).toBe(false);

  await syntheticMainDrag(host, 'settings', 0.25, false);
  expect((await panelState(host)).homePercent).toBeCloseTo(25, 1);
  await host.evaluate(element => {
    const phone = element.shadowRoot?.querySelector('#phone');
    if (!(phone instanceof HTMLElement)) throw new Error('Reverb phone is unavailable');
    const rect = phone.getBoundingClientRect();
    phone.dispatchEvent(new PointerEvent('pointerup', {
      bubbles: true, pointerId: 81, pointerType: 'touch', isPrimary: true,
      clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height * 0.45,
    }));
  });
  await expect(host.locator('#settingsScreen')).toHaveClass(/active/);
  await host.locator('#settingsNav').click();
  await expect.poll(() => panelState(host).then(state => state.settingsVisible)).toBe(false);

  await syntheticMainDrag(host, 'settings', 0.08, true);
  await expect.poll(() => panelState(host).then(state => state.settingsVisible)).toBe(false);
  const rejected = await panelState(host);
  expect(rejected.homeActive).toBe(true);
  expect(rejected.settingsActive).toBe(false);
  expect(rejected.homePercent).toBeCloseTo(0, 2);
});

test('Reverb Library rises under a fixed app bar and edge close settles instead of teleporting', async ({ page }, info) => {
  const host = await visitReverb(page, info);
  const opening = await collectLibraryOpen(host);
  expectNativeSettle(opening, 'open');
  expect(opening.every(sample => sample.topbarTransform === 'none')).toBe(true);
  expect(opening.some(sample => sample.offset > 0)).toBe(true);
  await expect(host.locator('#libraryScreen')).toHaveClass(/active/);

  const closing = await collectLibraryEdgeClose(host);
  expectNativeSettle(closing, 'close');
  const closed = await panelState(host);
  expect(closed.homeActive).toBe(true);
  expect(closed.libraryActive).toBe(false);
  expect(closed.libraryProgress).toBe(0);
});

test('Reverb Library app bar exposes the native Back control and returns home', async ({ page }, info) => {
  const host = await visitReverb(page, info);
  await host.locator('#openLibrary').click();
  await expect(host.locator('#libraryScreen')).toHaveClass(/active/);
  await expect.poll(() => panelState(host).then(state => state.libraryProgress)).toBeCloseTo(1, 2);
  const back = host.locator('#libraryBack');
  await expect(back).toBeVisible();
  const geometry = await back.evaluate(element => ({
    width: element.offsetWidth,
    height: element.offsetHeight,
  }));
  expect(geometry.width).toBeCloseTo(46, 0);
  expect(geometry.height).toBeCloseTo(46, 0);
  await back.click();
  await expect.poll(() => panelState(host).then(state => state.libraryProgress)).toBeCloseTo(0, 2);
  const closed = await panelState(host);
  expect(closed.homeActive).toBe(true);
  expect(closed.libraryActive).toBe(false);
});

async function collectBufferClickFlip(host, targetBuffer) {
  return host.evaluate(async (element, targetBuffer) => {
    const root = element.shadowRoot;
    const target = root?.querySelector(`.buffer-segment[data-buffer="${targetBuffer}"]`);
    const one = root?.querySelector('.buffer-segment[data-buffer="one"]');
    const loop = root?.querySelector('.buffer-segment[data-buffer="loop"]');
    const face = root?.querySelector('#blobFlipFace');
    const actionIcons = [...(root?.querySelectorAll('.actions-row .action-button svg') ?? [])];
    if (!(target instanceof HTMLElement) || !(one instanceof HTMLElement)
      || !(loop instanceof HTMLElement) || !(face instanceof HTMLElement)
      || actionIcons.length !== 4) throw new Error('Reverb buffer flip surfaces are unavailable');
    const startedAt = performance.now();
    const samples = [];
    target.click();
    while (performance.now() - startedAt < 600) {
      await new Promise(requestAnimationFrame);
      const progress = Number(face.style.getPropertyValue('--buffer-flip-progress') || 0);
      samples.push({
        elapsed: performance.now() - startedAt,
        progress,
        degrees: Number(face.style.getPropertyValue('--buffer-flip-degrees') || 0),
        depth: Number(face.style.getPropertyValue('--buffer-depth-scale') || 1),
        oneSelected: one.getAttribute('aria-selected') === 'true',
        loopSelected: loop.getAttribute('aria-selected') === 'true',
        firstActionTransform: actionIcons[0].style.transform,
        filesTransform: actionIcons[3].style.transform,
      });
      const targetSelected = target.getAttribute('aria-selected') === 'true';
      if (targetSelected && progress === 0 && performance.now() - startedAt > 180) break;
    }
    return samples;
  }, targetBuffer);
}

async function probeBufferFace(host, fraction) {
  return host.evaluate(async (element, fraction) => {
    const root = element.shadowRoot;
    const area = root?.querySelector('.blob-area');
    const face = root?.querySelector('#blobFlipFace');
    const one = root?.querySelector('.buffer-segment[data-buffer="one"]');
    const loop = root?.querySelector('.buffer-segment[data-buffer="loop"]');
    if (!(area instanceof HTMLElement) || !(face instanceof HTMLElement)
      || !(one instanceof HTMLElement) || !(loop instanceof HTMLElement))
      throw new Error('Reverb buffer face probe surfaces are unavailable');
    const rect = area.getBoundingClientRect();
    const startX = rect.left + rect.width * 0.65;
    const y = rect.top + rect.height * 0.5;
    const endX = startX - rect.width * fraction;
    const pointer = (type, clientX) => new PointerEvent(type, {
      bubbles: true,
      pointerId: 92,
      pointerType: 'touch',
      isPrimary: true,
      clientX,
      clientY: y,
    });
    area.dispatchEvent(pointer('pointerdown', startX));
    area.dispatchEvent(pointer('pointermove', endX));
    const faceRect = face.getBoundingClientRect();
    const snapshot = {
      progress: Number(face.style.getPropertyValue('--buffer-flip-progress') || 0),
      degrees: Number(face.style.getPropertyValue('--buffer-flip-degrees') || 0),
      depth: Number(face.style.getPropertyValue('--buffer-depth-scale') || 1),
      oneSelected: one.getAttribute('aria-selected') === 'true',
      loopSelected: loop.getAttribute('aria-selected') === 'true',
      transform: face.style.transform,
      projection: {
        areaWidth: rect.width,
        faceWidth: faceRect.width,
        centerDelta: Math.abs(
          (faceRect.left + faceRect.width / 2) - (rect.left + rect.width / 2),
        ),
      },
    };
    area.dispatchEvent(pointer('pointercancel', endX));
    const startedAt = performance.now();
    while (performance.now() - startedAt < 700) {
      await new Promise(requestAnimationFrame);
      const progress = Number(face.style.getPropertyValue('--buffer-flip-progress') || 0);
      if (progress === 0 && one.getAttribute('aria-selected') === 'true') break;
    }
    return snapshot;
  }, fraction);
}

async function dragBuffer(host, fraction, release = true) {
  return host.evaluate((element, { fraction, release }) => {
    const root = element.shadowRoot;
    const area = root?.querySelector('.blob-area');
    const face = root?.querySelector('#blobFlipFace');
    if (!(area instanceof HTMLElement) || !(face instanceof HTMLElement))
      throw new Error('Reverb buffer drag surfaces are unavailable');
    const rect = area.getBoundingClientRect();
    const x = rect.left + rect.width * 0.65;
    const y = rect.top + rect.height * 0.5;
    const endX = x - rect.width * fraction;
    const pointer = (type, clientX) => new PointerEvent(type, {
      bubbles: true,
      pointerId: 91,
      pointerType: 'touch',
      isPrimary: true,
      clientX,
      clientY: y,
    });
    area.dispatchEvent(pointer('pointerdown', x));
    area.dispatchEvent(pointer('pointermove', endX));
    const progress = Number(face.style.getPropertyValue('--buffer-flip-progress') || 0);
    if (release) area.dispatchEvent(pointer('pointerup', endX));
    return progress;
  }, { fraction, release });
}

test('Reverb buffer selector uses the native 260ms depth flip and swaps faces at 50%', async ({ page }, info) => {
  const host = await visitReverb(page, info);
  const projection = await probeBufferFace(host, 0.25);
  expect(projection.transform).toContain('perspective(1000px)');
  expect(projection.projection.faceWidth / projection.projection.areaWidth).toBeGreaterThan(0.6);
  expect(projection.projection.faceWidth / projection.projection.areaWidth).toBeLessThan(0.9);
  expect(projection.projection.centerDelta / projection.projection.areaWidth).toBeLessThan(0.08);

  const outgoing = await probeBufferFace(host, 0.49);
  const incoming = await probeBufferFace(host, 0.51);
  expect(outgoing.progress).toBeCloseTo(0.49, 2);
  expect(outgoing.oneSelected && !outgoing.loopSelected).toBe(true);
  expect(incoming.progress).toBeCloseTo(0.51, 2);
  expect(!incoming.oneSelected && incoming.loopSelected).toBe(true);
  for (const sample of [outgoing, incoming]) {
    const expectedDegrees = -(sample.progress < 0.5 ? sample.progress : sample.progress - 1) * 180;
    const expectedDepth = 0.94 + 0.06 * Math.abs(sample.progress * 2 - 1);
    expect(sample.degrees).toBeCloseTo(expectedDegrees, 3);
    expect(sample.depth).toBeCloseTo(expectedDepth, 4);
  }

  const samples = await collectBufferClickFlip(host, 'loop');
  expect(samples.length).toBeGreaterThan(2);
  const intermediate = samples.filter(sample => sample.progress > 0.02 && sample.progress < 0.98);
  expect(intermediate.length).toBeGreaterThan(0);
  for (const sample of intermediate) {
    const direction = -1;
    const expectedDegrees = direction * (sample.progress < 0.5 ? sample.progress : sample.progress - 1) * 180;
    const expectedDepth = 0.94 + 0.06 * Math.abs(sample.progress * 2 - 1);
    expect(sample.degrees).toBeCloseTo(expectedDegrees, 3);
    expect(sample.depth).toBeCloseTo(expectedDepth, 4);
    expect(sample.firstActionTransform).toContain('rotateY');
    expect(sample.filesTransform).toBe('');
  }
  const terminal = samples.at(-1);
  // The runtime tween is fixed at 260 ms. Wall-clock completion can be delayed by a busy
  // browser worker after the terminal frame is due, so only reject an unrealistically early
  // teleport here; the controlled 49%/51% probes above own the exact motion geometry.
  expect(terminal.elapsed).toBeGreaterThanOrEqual(230);
  expect(terminal.loopSelected).toBe(true);
  expect(terminal.progress).toBe(0);
});

test('Reverb buffer swipe tracks drag distance and uses the native 16% commit threshold', async ({ page }, info) => {
  const host = await visitReverb(page, info);
  const rejectedProgress = await dragBuffer(host, 0.10, true);
  expect(rejectedProgress).toBeCloseTo(0.10, 2);
  await expect.poll(() => host.locator('.buffer-segment[data-buffer="one"]').getAttribute('aria-selected')).toBe('true');
  await expect.poll(() => host.evaluate(element => {
    const face = element.shadowRoot?.querySelector('#blobFlipFace');
    return face instanceof HTMLElement
      ? Number(face.style.getPropertyValue('--buffer-flip-progress') || 0)
      : -1;
  })).toBe(0);

  const committedProgress = await dragBuffer(host, 0.25, true);
  expect(committedProgress).toBeCloseTo(0.25, 2);
  await expect.poll(() => host.locator('.buffer-segment[data-buffer="loop"]').getAttribute('aria-selected')).toBe('true');
  await expect.poll(() => host.evaluate(element => {
    const face = element.shadowRoot?.querySelector('#blobFlipFace');
    return face instanceof HTMLElement
      ? Number(face.style.getPropertyValue('--buffer-flip-progress') || 0)
      : -1;
  })).toBe(0);
});

async function collectAboutMotion(host, direction) {
  return host.evaluate(async (element, direction) => {
    const root = element.shadowRoot;
    const phone = root?.querySelector('#phone');
    const sheet = root?.querySelector('#aboutSheet');
    const home = root?.querySelector('#homeScreen');
    const trigger = direction === 'open'
      ? root?.querySelector('#brandButton')
      : root?.querySelector('#aboutClose');
    if (!(phone instanceof HTMLElement) || !(sheet instanceof HTMLElement)
      || !(home instanceof HTMLElement) || !(trigger instanceof HTMLElement))
      throw new Error('Reverb About motion surfaces are unavailable');
    const startedAt = performance.now();
    const samples = [];
    trigger.click();
    while (performance.now() - startedAt < 500) {
      await new Promise(requestAnimationFrame);
      const style = getComputedStyle(sheet);
      const matrix = new DOMMatrix(style.transform);
      const height = Math.max(1, sheet.getBoundingClientRect().height);
      const progress = 1 - Math.abs(matrix.m42) / height;
      samples.push({
        elapsed: performance.now() - startedAt,
        progress,
        opacity: Number(style.opacity),
        transitionDuration: style.transitionDuration,
        ariaHidden: sheet.getAttribute('aria-hidden'),
        inert: sheet.inert,
        backgroundInert: home.inert,
        mounted: phone.classList.contains('about-mounted'),
      });
      const finished = direction === 'open'
        ? progress >= 0.999 && Number(style.opacity) >= 0.999
        : !phone.classList.contains('about-mounted');
      if (finished) break;
    }
    return samples;
  }, direction);
}

test('Reverb About uses native 220/160ms enter and 190/140ms exit while retaining modal ownership', async ({ page }, info) => {
  const host = await visitReverb(page, info);
  const opening = await collectAboutMotion(host, 'open');
  expect(opening.some(sample => sample.progress > 0.02 && sample.progress < 0.98)).toBe(true);
  expect(opening.some(sample => sample.opacity > 0.02 && sample.opacity < 0.98)).toBe(true);
  const openTerminal = opening.at(-1);
  expect(openTerminal.elapsed).toBeGreaterThanOrEqual(190);
  expect(openTerminal.elapsed).toBeLessThan(450);
  expect(openTerminal.transitionDuration).toBe('0.22s, 0.16s');
  expect(openTerminal.progress).toBeCloseTo(1, 2);
  expect(openTerminal.opacity).toBeCloseTo(1, 2);
  expect(openTerminal.backgroundInert).toBe(true);

  const closing = await collectAboutMotion(host, 'close');
  const intermediate = closing.filter(sample => sample.mounted);
  expect(intermediate.length).toBeGreaterThan(0);
  expect(intermediate.every(sample => sample.ariaHidden === 'false')).toBe(true);
  expect(intermediate.every(sample => sample.inert === false)).toBe(true);
  expect(intermediate.every(sample => sample.backgroundInert === true)).toBe(true);
  expect(intermediate.some(sample => sample.progress > 0.02 && sample.progress < 0.98)).toBe(true);
  const closeTerminal = closing.at(-1);
  expect(closeTerminal.elapsed).toBeGreaterThanOrEqual(160);
  expect(closeTerminal.elapsed).toBeLessThan(380);
  expect(intermediate.at(-1).transitionDuration).toBe('0.19s, 0.14s');
  expect(closeTerminal.mounted).toBe(false);
  expect(closeTerminal.ariaHidden).toBe('true');
  expect(closeTerminal.inert).toBe(true);
  expect(closeTerminal.backgroundInert).toBe(false);
});

async function collectRangeOpening(host) {
  return host.evaluate(async element => {
    const root = element.shadowRoot;
    const open = root?.querySelector('#openRange');
    const blob = root?.querySelector('#blobControl');
    const screen = root?.querySelector('#rangeScreen');
    const main = root?.querySelector('.range-main');
    const wavebox = root?.querySelector('.range-timeline .wavebox');
    const morph = root?.querySelector('#rangeMorphWave');
    const coarseWave = root?.querySelector('#rangeCoarseWave');
    const finalWave = root?.querySelector('#rangeFinalWave');
    const detailFront = root?.querySelector('#rangeDetailFront');
    const play = root?.querySelector('#rangePlay');
    if (!(open instanceof HTMLElement) || !(blob instanceof HTMLElement)
      || !(screen instanceof HTMLElement) || !(main instanceof HTMLElement)
      || !(wavebox instanceof HTMLElement) || !(morph instanceof SVGElement)
      || !(coarseWave instanceof SVGElement) || !(finalWave instanceof SVGElement)
      || !(detailFront instanceof HTMLElement)
      || !(play instanceof HTMLButtonElement))
      throw new Error('Reverb Range motion surfaces are unavailable');
    const blobRect = blob.getBoundingClientRect();
    const sourceCenter = {
      x: blobRect.left + blobRect.width / 2,
      y: blobRect.top + blobRect.height / 2,
    };
    const startedAt = performance.now();
    const samples = [];
    const readSample = () => {
      const transition = Number(screen.style.getPropertyValue('--range-transition-progress') || 0);
      const morphProgress = Number(morph.style.getPropertyValue('--range-morph-progress') || 0);
      const chrome = Number(screen.style.getPropertyValue('--range-chrome-alpha') || 0);
      const reveal = Number(screen.style.getPropertyValue('--range-wave-reveal') || 0);
      const detail = Number(screen.style.getPropertyValue('--range-wave-detail-reveal') || 0);
      const rect = morph.getBoundingClientRect();
      const transform = new DOMMatrix(getComputedStyle(morph).transform);
      return {
        elapsed: performance.now() - startedAt,
        transition,
        morphProgress,
        chrome,
        reveal,
        detail,
        detailFrontOpacity: Number(getComputedStyle(detailFront).opacity),
        ready: screen.dataset.rangeInteractionReady === 'true',
        inert: main.inert,
        activeId: root?.activeElement?.id ?? '',
        morphRect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        sourceCenter,
        transform: {
          a: transform.a,
          d: transform.d,
          e: transform.e,
          f: transform.f,
        },
        coarseClip: getComputedStyle(coarseWave).clipPath,
        detailClip: getComputedStyle(finalWave).clipPath,
        coarseOpacity: Number(getComputedStyle(coarseWave).opacity),
        finalOpacity: Number(getComputedStyle(finalWave).opacity),
        coarseSegments: (coarseWave.querySelector('.wave-outside')?.getAttribute('d')?.match(/ L/g) ?? []).length,
        detailSegments: (finalWave.querySelector('.wave-outside')?.getAttribute('d')?.match(/ L/g) ?? []).length,
        playLabel: play.getAttribute('aria-label'),
      };
    };
    open.click();
    // Native timeline interaction is disabled until 98%; this programmatic click
    // deliberately exercises the capture guard during the opening transition.
    play.click();
    // startRangeOpening renders frame 0 synchronously. Preserve that exact geometry before
    // an overloaded browser can skip directly into later animation frames.
    samples.push(readSample());
    while (performance.now() - startedAt < 2200) {
      await new Promise(requestAnimationFrame);
      const sample = readSample();
      samples.push(sample);
      if (sample.transition >= 0.999 && sample.reveal >= 0.999 && sample.detail >= 0.999) break;
    }
    return samples;
  });
}

test('Reverb Range opens with the native 760ms blob-to-waveform morph and delayed readiness', async ({ page }, info) => {
  const host = await visitReverb(page, info);
  const samples = await collectRangeOpening(host);
  expect(samples.length).toBeGreaterThan(8);

  const sourceFrame = samples.find(sample => sample.transition === 0);
  expect(sourceFrame).toBeTruthy();
  expect(sourceFrame.morphProgress).toBe(0);
  expect(sourceFrame.chrome).toBe(0);
  expect(sourceFrame.ready).toBe(false);
  expect(sourceFrame.inert).toBe(true);
  expect(sourceFrame.playLabel).toBe('Play');
  expect(Math.abs(sourceFrame.morphRect.width - sourceFrame.morphRect.height)).toBeLessThan(2.5);
  expect(sourceFrame.morphRect.x + sourceFrame.morphRect.width / 2).toBeCloseTo(sourceFrame.sourceCenter.x, 0);
  expect(sourceFrame.morphRect.y + sourceFrame.morphRect.height / 2).toBeCloseTo(sourceFrame.sourceCenter.y, 0);

  const preChrome = samples.filter(sample => sample.transition <= 0.46);
  expect(preChrome.length).toBeGreaterThan(0);
  expect(preChrome.every(sample => Math.abs(sample.chrome) < 0.001)).toBe(true);
  const chromeFrame = samples.find(sample => sample.transition > 0.52 && sample.transition < 0.84);
  expect(chromeFrame).toBeTruthy();
  expect(chromeFrame.chrome).toBeCloseTo(
    Math.max(0, Math.min(1, (chromeFrame.transition - 0.46) / 0.42)),
    3,
  );

  const firstReveal = samples.find(sample => sample.reveal > 0.001);
  expect(firstReveal).toBeTruthy();
  expect(firstReveal.transition).toBeGreaterThanOrEqual(0.95);
  const firstDetail = samples.find(sample => sample.detail > 0.001);
  expect(firstDetail).toBeTruthy();
  expect(firstDetail.reveal).toBeGreaterThan(0.995);
  expect(firstDetail.detailFrontOpacity).toBeCloseTo(0, 2);

  const revealProbe = samples.find(sample => sample.reveal > 0.02 && sample.reveal < 0.98);
  const detailProbe = samples.find(sample => sample.detail > 0.02 && sample.detail < 0.98);
  if (revealProbe && detailProbe) {
    const revealStartedAt = revealProbe.elapsed - invertFastOutSlowIn(revealProbe.reveal) * 430;
    const detailStartedAt = detailProbe.elapsed - invertFastOutSlowIn(detailProbe.detail) * 330;
    // Native detail construction waits until the coarse pass is complete, then waits another
    // 280 ms before publishing detail buckets: 430 ms coarse reveal + 280 ms delay.
    expect(detailStartedAt - revealStartedAt).toBeCloseTo(710, -1);
  } else {
    const lastCoarseOnly = [...samples].reverse().find(sample => sample.reveal >= 0.995 && sample.detail <= 0.001);
    expect(lastCoarseOnly).toBeTruthy();
    expect(firstDetail.elapsed - lastCoarseOnly.elapsed).toBeGreaterThanOrEqual(180);
  }

  const coarseOnly = samples.find(sample => sample.reveal > 0.5 && sample.detail < 0.001);
  expect(coarseOnly).toBeTruthy();
  expect(coarseOnly.coarseSegments).toBeGreaterThan(40);
  expect(coarseOnly.detailSegments).toBeGreaterThan(coarseOnly.coarseSegments * 3);
  expect(coarseOnly.coarseClip).not.toBe(coarseOnly.detailClip);
  const polishing = samples.find(sample =>
    sample.reveal > 0.995 && sample.detail > 0.05 && sample.detail < 0.95
  );
  if (polishing) {
    expect(polishing.coarseClip).not.toBe(polishing.detailClip);
    expect(polishing.detailFrontOpacity).toBeCloseTo(0, 2);
  }
  expect(samples.filter(sample => sample.transition < 0.98).every(sample => !sample.ready)).toBe(true);
  const firstReady = samples.find(sample => sample.ready);
  expect(firstReady).toBeTruthy();
  expect(firstReady.transition).toBeGreaterThanOrEqual(0.98);
  expect(firstReady.inert).toBe(false);
  expect(firstReady.activeId).toBe('rangeDurationWheel');

  const transitionTerminal = samples.find(sample => sample.transition >= 0.999);
  expect(transitionTerminal).toBeTruthy();
  expect(transitionTerminal.elapsed).toBeGreaterThanOrEqual(700);
  expect(samples.filter(sample => sample.elapsed >= 820)
    .every(sample => sample.transition >= 0.999)).toBe(true);
  expect(transitionTerminal.morphProgress).toBeCloseTo(1, 2);
  expect(transitionTerminal.chrome).toBeCloseTo(1, 2);
  expect(transitionTerminal.transform.a).toBeCloseTo(1, 2);
  expect(transitionTerminal.transform.d).toBeCloseTo(1, 2);
  expect(transitionTerminal.transform.e).toBeCloseTo(0, 1);
  expect(transitionTerminal.transform.f).toBeCloseTo(0, 1);

  const revealTerminal = samples.at(-1);
  expect(revealTerminal.reveal).toBeCloseTo(1, 2);
  expect(revealTerminal.detail).toBeCloseTo(1, 2);
  expect(revealTerminal.detailFrontOpacity).toBeCloseTo(0, 2);
  expect(revealTerminal.coarseOpacity).toBeCloseTo(1, 2);
  expect(revealTerminal.finalOpacity).toBeCloseTo(1, 2);
  expect(revealTerminal.coarseClip).not.toBe(revealTerminal.detailClip);
});

async function openRangeReady(host) {
  await host.locator('#openRange').evaluate(element => element.click());
  await expect.poll(() => host.evaluate(element => {
    const screen = element.shadowRoot?.querySelector('#rangeScreen');
    return screen instanceof HTMLElement
      ? screen.dataset.rangeInteractionReady
      : 'missing';
  })).toBe('true');
}

async function collectFineReturn(host) {
  return host.evaluate(async element => {
    const root = element.shadowRoot;
    const fine = root?.querySelector('.fine-control');
    const puck = root?.querySelector('#rangePlay');
    const fieldPath = root?.querySelector('#rangeFineFieldPath');
    if (!(fine instanceof HTMLElement) || !(puck instanceof HTMLElement)
      || !(fieldPath instanceof SVGPathElement))
      throw new Error('Reverb fine-seek surfaces are unavailable');
    const rect = fine.getBoundingClientRect();
    const startX = rect.left + rect.width * 0.78;
    const startY = rect.top + rect.height * 0.50;
    const moveY = startY - rect.height * 0.22;
    const pointer = (type, x, y) => new PointerEvent(type, {
      bubbles: true,
      pointerId: 101,
      pointerType: 'touch',
      isPrimary: true,
      clientX: x,
      clientY: y,
    });
    fine.dispatchEvent(pointer('pointerdown', startX, startY));
    fine.dispatchEvent(pointer('pointermove', startX, moveY));
    const releaseX = Number(fine.style.getPropertyValue('--range-fine-horizontal-pull') || 0);
    const releaseY = Number(fine.style.getPropertyValue('--range-fine-raw-vertical-pull') || 0);
    const draggedPath = fieldPath.getAttribute('d') ?? '';
    const startedAt = performance.now();
    fine.dispatchEvent(pointer('pointerup', startX, moveY));
    const samples = [];
    while (performance.now() - startedAt < 500) {
      await new Promise(requestAnimationFrame);
      const x = Number(fine.style.getPropertyValue('--range-fine-horizontal-pull') || 0);
      const y = Number(fine.style.getPropertyValue('--range-fine-raw-vertical-pull') || 0);
      samples.push({
        elapsed: performance.now() - startedAt,
        x,
        y,
        puckTransform: getComputedStyle(puck).transform,
        fieldPath: fieldPath.getAttribute('d') ?? '',
      });
      if (performance.now() - startedAt >= 210
        && Math.abs(x) < 0.0001 && Math.abs(y) < 0.0001) break;
    }
    return { releaseX, releaseY, draggedPath, samples };
  });
}

test('Reverb fine seek redraws around the puck and returns with the native 210ms cosh spring', async ({ page }, info) => {
  const host = await visitReverb(page, info);
  await openRangeReady(host);
  const result = await collectFineReturn(host);
  expect(Math.abs(result.releaseX)).toBeGreaterThan(0.2);
  expect(Math.abs(result.releaseY)).toBeGreaterThan(0.02);
  expect(result.draggedPath.length).toBeGreaterThan(80);
  expect(result.samples.length).toBeGreaterThan(3);
  const nonzero = result.samples.filter(sample => Math.abs(sample.x) > 0.001);
  expect(nonzero.length).toBeGreaterThan(1);
  for (let index = 1; index < nonzero.length; index++) {
    expect(Math.abs(nonzero[index].x)).toBeLessThanOrEqual(
      Math.abs(nonzero[index - 1].x) + 0.003,
    );
  }
  const middle = result.samples.find(sample => sample.elapsed >= 90 && sample.elapsed <= 145);
  expect(middle).toBeTruthy();
  expect(Math.abs(middle.x)).toBeGreaterThan(0.001);
  expect(Math.abs(middle.x)).toBeLessThan(Math.abs(result.releaseX) * 0.65);
  expect(middle.fieldPath).not.toBe(result.draggedPath);
  const terminal = result.samples.at(-1);
  expect(terminal.elapsed).toBeGreaterThanOrEqual(190);
  expect(terminal.elapsed).toBeLessThan(300);
  expect(terminal.x).toBeCloseTo(0, 4);
  expect(terminal.y).toBeCloseTo(0, 4);
  expect(terminal.puckTransform === 'none' || terminal.puckTransform.includes('matrix(1, 0, 0, 1, 0, 0)')).toBe(true);
});

async function collectRecordingExpand(host, index = 0) {
  return host.evaluate(async (element, index) => {
    const root = element.shadowRoot;
    const cards = [...(root?.querySelectorAll('.recording-card') ?? [])];
    const card = cards[index];
    const summary = card?.querySelector('.recording-summary');
    const expanded = card?.querySelector('.recording-expanded');
    const player = card?.querySelector('.recording-player');
    const play = card?.querySelector('.recording-play');
    if (!(card instanceof HTMLElement) || !(summary instanceof HTMLButtonElement)
      || !(expanded instanceof HTMLElement) || !(player instanceof HTMLElement)
      || !(play instanceof HTMLButtonElement))
      throw new Error('Reverb recording expansion surfaces are unavailable');
    const startedAt = performance.now();
    const samples = [];
    summary.click();
    while (performance.now() - startedAt < 1100) {
      await new Promise(requestAnimationFrame);
      const morph = Number(player.style.getPropertyValue('--recording-wave-morph') || 0);
      samples.push({
        elapsed: performance.now() - startedAt,
        expandedHeight: expanded.offsetHeight,
        targetHeight: player.scrollHeight,
        opacity: Number(getComputedStyle(player).opacity),
        morph,
        ariaExpanded: summary.getAttribute('aria-expanded'),
        ariaHidden: expanded.getAttribute('aria-hidden'),
        inert: expanded.inert,
        playLabel: play.getAttribute('aria-label'),
      });
      if (morph >= 0.999 && Math.abs(expanded.offsetHeight - player.scrollHeight) < 1)
        break;
    }
    return samples;
  }, index);
}

async function collectRecordingCollapse(host, index = 0) {
  return host.evaluate(async (element, index) => {
    const root = element.shadowRoot;
    const card = [...(root?.querySelectorAll('.recording-card') ?? [])][index];
    const summary = card?.querySelector('.recording-summary');
    const expanded = card?.querySelector('.recording-expanded');
    const player = card?.querySelector('.recording-player');
    if (!(summary instanceof HTMLButtonElement) || !(expanded instanceof HTMLElement)
      || !(player instanceof HTMLElement))
      throw new Error('Reverb recording collapse surfaces are unavailable');
    const startedAt = performance.now();
    const samples = [];
    summary.click();
    while (performance.now() - startedAt < 600) {
      await new Promise(requestAnimationFrame);
      samples.push({
        elapsed: performance.now() - startedAt,
        height: expanded.getBoundingClientRect().height,
        opacity: Number(getComputedStyle(player).opacity),
        ariaExpanded: summary.getAttribute('aria-expanded'),
        ariaHidden: expanded.getAttribute('aria-hidden'),
        inert: expanded.inert,
      });
      if (expanded.getBoundingClientRect().height < 0.5 && expanded.getAttribute('aria-hidden') === 'true')
        break;
    }
    return samples;
  }, index);
}

test('Reverb Library recording expands inline with native card/player timing and waveform morph', async ({ page }, info) => {
  const host = await visitReverb(page, info);
  await host.locator('#openLibrary').evaluate(element => element.click());
  await expect.poll(() => host.evaluate(element => {
    const screen = element.shadowRoot?.querySelector('#libraryScreen');
    return screen instanceof HTMLElement
      ? Number(screen.style.getPropertyValue('--library-progress') || 0)
      : -1;
  })).toBeCloseTo(1, 2);

  const opening = await collectRecordingExpand(host, 0);
  expect(opening.length).toBeGreaterThan(8);
  expect(opening[0].ariaExpanded).toBe('true');
  expect(opening[0].ariaHidden).toBe('false');
  expect(opening[0].inert).toBe(false);
  expect(opening[0].playLabel).toBe('Pause');
  const sizeMid = opening.find(sample => sample.elapsed >= 120 && sample.elapsed <= 220);
  expect(sizeMid).toBeTruthy();
  expect(sizeMid.expandedHeight).toBeGreaterThan(0);
  expect(sizeMid.expandedHeight).toBeLessThan(sizeMid.targetHeight);
  const earlyFade = opening.find(sample => sample.elapsed < 65);
  expect(earlyFade).toBeTruthy();
  expect(earlyFade.opacity).toBeLessThan(0.06);
  const fadeMid = opening.find(sample => sample.opacity > 0.05 && sample.opacity < 0.99);
  if (fadeMid) {
    expect(fadeMid.elapsed).toBeGreaterThanOrEqual(70);
    expect(fadeMid.elapsed).toBeLessThan(340);
  } else {
    const skippedFadeFrame = opening.some((sample, index) => {
      const previous = opening[index - 1];
      if (!previous) return false;
      return previous.opacity <= 0.05 && sample.opacity >= 0.99
        && sample.elapsed - previous.elapsed >= 120;
    });
    expect(skippedFadeFrame).toBe(true);
  }
  const sizeTerminal = opening.find(
    sample => sample.elapsed >= 280
      && Math.abs(sample.expandedHeight - sample.targetHeight) < 1.5,
  );
  expect(sizeTerminal).toBeTruthy();
  const morphMid = opening.find(sample => sample.morph > 0.15 && sample.morph < 0.9);
  expect(morphMid).toBeTruthy();
  const terminal = opening.at(-1);
  expect(terminal.elapsed).toBeGreaterThanOrEqual(700);
  expect(terminal.elapsed).toBeLessThan(950);
  expect(terminal.morph).toBeCloseTo(1, 2);

  // Native keeps only one recording expanded at a time.
  await host.locator('.recording-summary').nth(1).evaluate(element => element.click());
  await expect(host.locator('.recording-card').nth(1)).toHaveClass(/expanded/);
  await expect(host.locator('.recording-card').nth(0)).not.toHaveClass(/expanded/);
  await expect.poll(() => host.locator('.recording-expanded').nth(0).getAttribute('aria-hidden')).toBe('true');
});

test('Reverb Library recording collapse uses native 260ms size and 140ms fade exit', async ({ page }, info) => {
  const host = await visitReverb(page, info);
  await host.locator('#openLibrary').evaluate(element => element.click());
  await expect.poll(() => host.evaluate(element => {
    const screen = element.shadowRoot?.querySelector('#libraryScreen');
    return screen instanceof HTMLElement
      ? Number(screen.style.getPropertyValue('--library-progress') || 0)
      : -1;
  })).toBeCloseTo(1, 2);
  await collectRecordingExpand(host, 0);
  const closing = await collectRecordingCollapse(host, 0);
  expect(closing.length).toBeGreaterThan(3);
  expect(closing[0].ariaExpanded).toBe('false');
  const fadeMid = closing.find(sample => sample.elapsed >= 60 && sample.elapsed <= 130);
  expect(fadeMid).toBeTruthy();
  expect(fadeMid.opacity).toBeGreaterThan(0.01);
  expect(fadeMid.opacity).toBeLessThan(0.99);
  const sizeMid = closing.find(sample => sample.elapsed >= 100 && sample.elapsed <= 210);
  expect(sizeMid).toBeTruthy();
  expect(sizeMid.height).toBeGreaterThan(0);
  const terminal = closing.at(-1);
  expect(terminal.elapsed).toBeGreaterThanOrEqual(230);
  expect(terminal.elapsed).toBeLessThan(360);
  expect(terminal.height).toBeLessThan(0.5);
  expect(terminal.opacity).toBeCloseTo(0, 2);
  expect(terminal.ariaHidden).toBe('true');
  expect(terminal.inert).toBe(true);
});

async function collectRecordingFineReturn(host, index = 0) {
  return host.evaluate(async (element, index) => {
    const root = element.shadowRoot;
    const card = [...(root?.querySelectorAll('.recording-card') ?? [])][index];
    const fine = card?.querySelector('.recording-fine');
    const puck = card?.querySelector('.recording-play');
    const fieldPath = card?.querySelector('.recording-fine-path');
    const position = card?.querySelector('.recording-player-times .position');
    if (!(fine instanceof HTMLElement) || !(puck instanceof HTMLButtonElement)
      || !(fieldPath instanceof SVGPathElement) || !(position instanceof HTMLElement))
      throw new Error('Recording fine-seek surfaces are unavailable');
    const rect = fine.getBoundingClientRect();
    const x = rect.left + rect.width * 0.82;
    const startY = rect.top + rect.height * 0.50;
    const moveY = startY - rect.height * 0.24;
    const pointer = (type, px, py) => new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      pointerId: 131,
      pointerType: 'touch',
      isPrimary: true,
      clientX: px,
      clientY: py,
    });
    const before = {
      position: position.textContent ?? '',
      playLabel: puck.getAttribute('aria-label'),
    };
    fine.dispatchEvent(pointer('pointerdown', x, startY));
    fine.dispatchEvent(pointer('pointermove', x, moveY));
    const draggedPath = fieldPath.getAttribute('d') ?? '';
    const releaseX = Number(fine.style.getPropertyValue('--recording-fine-horizontal-pull') || 0);
    const releaseY = Number(fine.style.getPropertyValue('--recording-fine-raw-vertical-pull') || 0);
    const activeTransform = getComputedStyle(puck).transform;
    const activeStarted = performance.now();
    while (performance.now() - activeStarted < 150)
      await new Promise(requestAnimationFrame);
    const during = {
      position: position.textContent ?? '',
      playLabel: puck.getAttribute('aria-label'),
    };
    const startedAt = performance.now();
    fine.dispatchEvent(pointer('pointerup', x, moveY));
    const samples = [];
    while (performance.now() - startedAt < 500) {
      await new Promise(requestAnimationFrame);
      const horizontal = Number(fine.style.getPropertyValue('--recording-fine-horizontal-pull') || 0);
      const vertical = Number(fine.style.getPropertyValue('--recording-fine-raw-vertical-pull') || 0);
      samples.push({
        elapsed: performance.now() - startedAt,
        horizontal,
        vertical,
        path: fieldPath.getAttribute('d') ?? '',
        puckTransform: getComputedStyle(puck).transform,
        playLabel: puck.getAttribute('aria-label'),
        position: position.textContent ?? '',
      });
      if (performance.now() - startedAt >= 210
        && Math.abs(horizontal) < 0.0001 && Math.abs(vertical) < 0.0001) break;
    }
    return { before, during, releaseX, releaseY, draggedPath, activeTransform, samples };
  }, index);
}

test('Reverb recording fine seek uses native duration-scaled shuttle motion and 210ms spring-home', async ({ page }, info) => {
  const host = await visitReverb(page, info);
  await host.locator('#openLibrary').click();
  await page.waitForTimeout(260);
  await host.locator('.recording-summary').first().click();
  await page.waitForTimeout(380);

  const result = await collectRecordingFineReturn(host);
  expect(result.before.playLabel).toBe('Pause');
  expect(result.during.playLabel).toBe('Pause');
  expect(result.during.position).not.toBe(result.before.position);
  expect(Math.abs(result.releaseX)).toBeGreaterThan(0.25);
  expect(Math.abs(result.releaseY)).toBeGreaterThan(0.03);
  expect(result.draggedPath.length).toBeGreaterThan(80);
  expect(result.activeTransform).not.toBe('none');
  expect(result.samples.length).toBeGreaterThan(3);
  const nonzero = result.samples.filter(sample => Math.abs(sample.horizontal) > 0.001);
  expect(nonzero.length).toBeGreaterThan(1);
  for (let index = 1; index < nonzero.length; index++) {
    expect(Math.abs(nonzero[index].horizontal)).toBeLessThanOrEqual(
      Math.abs(nonzero[index - 1].horizontal) + 0.003,
    );
  }
  const middle = result.samples.find(sample => sample.elapsed >= 90 && sample.elapsed <= 150);
  expect(middle).toBeTruthy();
  expect(Math.abs(middle.horizontal)).toBeGreaterThan(0.001);
  expect(Math.abs(middle.horizontal)).toBeLessThan(Math.abs(result.releaseX) * 0.7);
  expect(middle.path).not.toBe(result.draggedPath);
  const terminal = result.samples.at(-1);
  expect(terminal.elapsed).toBeGreaterThanOrEqual(190);
  expect(terminal.elapsed).toBeLessThan(320);
  expect(terminal.horizontal).toBeCloseTo(0, 4);
  expect(terminal.vertical).toBeCloseTo(0, 4);
  expect(terminal.playLabel).toBe('Pause');
  expect(terminal.puckTransform === 'none' || terminal.puckTransform.includes('matrix(1, 0, 0, 1, 0, 0)')).toBe(true);
});

test('Reverb recording waveform scrub selects the nearest trim boundary and fine seek inherits it', async ({ page }, info) => {
  const host = await visitReverb(page, info);
  await host.locator('#openLibrary').click();
  await page.waitForTimeout(260);
  const card = host.locator('.recording-card').first();
  const summary = card.locator('.recording-summary');
  await summary.dispatchEvent('contextmenu');
  await host.locator('#recordingMenu').getByRole('menuitem', { name: 'Trim' }).click();
  await page.waitForTimeout(380);

  const result = await host.evaluate(async element => {
    const root = element.shadowRoot;
    const card = root?.querySelector('.recording-card.expanded');
    const wave = card?.querySelector('.recording-player-wave');
    const fine = card?.querySelector('.recording-fine');
    const start = card?.querySelector('.recording-player-times .position');
    const end = card?.querySelector('.recording-player-times .duration');
    const startBoundary = card?.querySelector('.recording-trim-boundary.start');
    const endBoundary = card?.querySelector('.recording-trim-boundary.end');
    if (!(wave instanceof HTMLElement) || !(fine instanceof HTMLElement)
      || !(start instanceof HTMLElement) || !(end instanceof HTMLElement)
      || !(startBoundary instanceof HTMLElement) || !(endBoundary instanceof HTMLElement))
      throw new Error('Recording trim scrub surfaces are unavailable');
    const pointer = (type, id, x, y) => new PointerEvent(type, {
      bubbles: true, cancelable: true, pointerId: id, pointerType: 'touch',
      isPrimary: true, clientX: x, clientY: y,
    });
    const waveRect = wave.getBoundingClientRect();
    const waveY = waveRect.top + waveRect.height * 0.5;
    const nearEnd = waveRect.left + waveRect.width * 0.96;
    const movedEnd = waveRect.left + waveRect.width * 0.82;
    wave.dispatchEvent(pointer('pointerdown', 141, nearEnd, waveY));
    wave.dispatchEvent(pointer('pointermove', 141, movedEnd, waveY));
    wave.dispatchEvent(pointer('pointerup', 141, movedEnd, waveY));
    const afterWave = {
      start: start.textContent ?? '',
      end: end.textContent ?? '',
      startActive: startBoundary.classList.contains('active'),
      endActive: endBoundary.classList.contains('active'),
    };
    const fineRect = fine.getBoundingClientRect();
    const fineX = fineRect.left + fineRect.width * 0.72;
    const fineY = fineRect.top + fineRect.height * 0.5;
    fine.dispatchEvent(pointer('pointerdown', 142, fineX, fineY));
    fine.dispatchEvent(pointer('pointermove', 142, fineX, fineY - fineRect.height * 0.18));
    const activeStarted = performance.now();
    while (performance.now() - activeStarted < 120)
      await new Promise(requestAnimationFrame);
    const duringFine = {
      start: start.textContent ?? '',
      end: end.textContent ?? '',
      startActive: startBoundary.classList.contains('active'),
      endActive: endBoundary.classList.contains('active'),
    };
    fine.dispatchEvent(pointer('pointerup', 142, fineX, fineY - fineRect.height * 0.18));
    return { afterWave, duringFine };
  });

  expect(result.afterWave.start).toBe('0:00.0');
  expect(result.afterWave.end).not.toBe('10:00.0');
  expect(result.afterWave.startActive).toBe(false);
  expect(result.afterWave.endActive).toBe(true);
  expect(result.duringFine.start).toBe('0:00.0');
  expect(result.duringFine.end).not.toBe(result.afterWave.end);
  expect(result.duringFine.startActive).toBe(false);
  expect(result.duringFine.endActive).toBe(true);
});

test('Reverb exports use the native spring save-status card lifecycle', async ({ page }, info) => {
  const host = await visitReverb(page, info);
  const samples = await host.evaluate(async element => {
    const root = element.shadowRoot;
    const exportFull = root?.querySelector('#exportFull');
    const status = root?.querySelector('#captureSaveStatus');
    const title = root?.querySelector('#captureSaveTitle');
    const subtitle = root?.querySelector('#captureSaveSubtitle');
    const cancel = root?.querySelector('#captureSaveCancel');
    const openRange = root?.querySelector('#openRange');
    if (!(exportFull instanceof HTMLButtonElement) || !(status instanceof HTMLElement)
      || !(title instanceof HTMLElement) || !(subtitle instanceof HTMLElement)
      || !(cancel instanceof HTMLButtonElement) || !(openRange instanceof HTMLButtonElement))
      throw new Error('Reverb export status surfaces are unavailable');
    exportFull.click();
    const startedAt = performance.now();
    const values = [];
    while (performance.now() - startedAt < 3800) {
      await new Promise(requestAnimationFrame);
      const style = getComputedStyle(status);
      const matrix = style.transform === 'none' ? new DOMMatrix() : new DOMMatrix(style.transform);
      values.push({
        elapsed: performance.now() - startedAt,
        y: matrix.m42,
        opacity: Number(style.opacity),
        hidden: status.hidden,
        state: status.className,
        title: title.textContent ?? '',
        subtitle: subtitle.textContent ?? '',
        cancelHidden: cancel.hidden,
        busy: openRange.disabled,
      });
      if (status.hidden && performance.now() - startedAt > 2800) break;
    }
    return values;
  });

  expect(samples.length).toBeGreaterThan(20);
  const first = samples[0];
  expect(first.hidden).toBe(false);
  expect(first.state).toContain('saving');
  expect(first.title).toBe('Saving');
  expect(first.subtitle).toBe('Reverb');
  expect(first.y).toBeGreaterThan(0);
  expect(first.opacity).toBeLessThan(1);
  expect(first.busy).toBe(true);

  const entryMid = samples.find(sample =>
    sample.elapsed >= 60 && sample.elapsed <= 260
      && sample.y > 0 && sample.y < first.y - 0.1
      && sample.opacity > first.opacity + 0.01 && sample.opacity < 1);
  expect(entryMid).toBeTruthy();

  const savingSettled = samples.find(sample =>
    sample.elapsed >= 350 && sample.elapsed < 1100 && sample.state.includes('saving')
      && Math.abs(sample.y) < 0.2 && sample.opacity > 0.995);
  expect(savingSettled).toBeTruthy();
  expect(savingSettled.cancelHidden).toBe(false);
  expect(savingSettled.busy).toBe(true);

  const saved = samples.find(sample => sample.state.includes('saved'));
  expect(saved).toBeTruthy();
  expect(saved.title).toMatch(/\.wav$/);
  expect(saved.subtitle).toContain('•');
  expect(saved.cancelHidden).toBe(true);
  expect(saved.busy).toBe(false);

  const held = samples.find(sample => sample.elapsed >= 2300 && sample.elapsed <= 2650);
  expect(held).toBeTruthy();
  expect(held.state).toContain('saved');
  expect(held.hidden).toBe(false);

  const exitMid = samples.find(sample =>
    sample.elapsed > 2700 && !sample.hidden && sample.y > 1 && sample.opacity < 0.99);
  expect(exitMid).toBeTruthy();
  const terminal = samples.at(-1);
  expect(terminal.hidden).toBe(true);
  expect(terminal.opacity).toBeCloseTo(0, 2);
});

test('Reverb feedback uses the native spring card and 2.8s success lifetime', async ({ page }, info) => {
  const host = await visitReverb(page, info);
  const samples = await host.evaluate(async element => {
    const root = element.shadowRoot;
    const openIncidents = root?.querySelector('#openIncidents');
    const incident = root?.querySelector('#incidentCard');
    const toast = root?.querySelector('#toast');
    if (!(openIncidents instanceof HTMLButtonElement) || !(incident instanceof HTMLElement)
      || !(toast instanceof HTMLElement))
      throw new Error('Reverb feedback surfaces are unavailable');
    openIncidents.click();
    incident.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    const startedAt = performance.now();
    const values = [];
    while (performance.now() - startedAt < 3800) {
      await new Promise(requestAnimationFrame);
      const style = getComputedStyle(toast);
      const matrix = style.transform === 'none' ? new DOMMatrix() : new DOMMatrix(style.transform);
      values.push({
        elapsed: performance.now() - startedAt,
        y: matrix.m42,
        opacity: Number(style.opacity),
        hidden: toast.hidden,
        show: toast.classList.contains('show'),
        text: toast.textContent ?? '',
        tone: toast.dataset.tone ?? '',
        background: style.backgroundColor,
      });
      if (toast.hidden && performance.now() - startedAt > 2900) break;
    }
    return values;
  });

  expect(samples.length).toBeGreaterThan(20);
  const first = samples[0];
  expect(first.hidden).toBe(false);
  expect(first.show).toBe(true);
  expect(first.text).toBe('Incident copied');
  expect(first.tone).toBe('success');
  expect(first.y).toBeGreaterThan(0);
  expect(first.opacity).toBeLessThan(1);

  const entryMid = samples.find(sample =>
    sample.elapsed >= 60 && sample.elapsed <= 260
      && sample.y > 0 && sample.y < first.y - 0.1
      && sample.opacity > first.opacity + 0.01 && sample.opacity < 1);
  expect(entryMid).toBeTruthy();
  const settled = samples.find(sample =>
    sample.elapsed >= 350 && sample.elapsed < 2500
      && Math.abs(sample.y) < 0.2 && sample.opacity > 0.995 && sample.show);
  expect(settled).toBeTruthy();

  const held = samples.find(sample => sample.elapsed >= 2500 && sample.elapsed <= 2750);
  expect(held).toBeTruthy();
  expect(held.show).toBe(true);
  expect(held.hidden).toBe(false);

  const exitMid = samples.find(sample =>
    sample.elapsed > 2800 && !sample.hidden && !sample.show
      && sample.y > 0.5 && sample.opacity < 0.99);
  expect(exitMid).toBeTruthy();
  const terminal = samples.at(-1);
  expect(terminal.hidden).toBe(true);
  expect(terminal.opacity).toBeCloseTo(0, 2);
});

test('Reverb Settings switch and segments use native stiffness-1500 springs', async ({ page }, info) => {
  const host = await visitReverb(page, info);
  await host.locator('#openSettings').click();
  await expect(host.locator('#settingsScreen')).toHaveClass(/active/);
  await page.waitForTimeout(260);

  const segmentSamples = await host.evaluate(async element => {
    const root = element.shadowRoot;
    const auto = root?.querySelector('#themeSegments .segment[data-theme="Auto"]');
    const light = root?.querySelector('#themeSegments .segment[data-theme="Light"]');
    if (!(auto instanceof HTMLButtonElement) || !(light instanceof HTMLButtonElement))
      throw new Error('Reverb theme segments are unavailable');
    const initial = {
      autoBg: getComputedStyle(auto).backgroundColor,
      autoColor: getComputedStyle(auto).color,
      lightBg: getComputedStyle(light).backgroundColor,
      lightColor: getComputedStyle(light).color,
    };
    light.click();
    const startedAt = performance.now();
    const values = [];
    while (performance.now() - startedAt < 350) {
      await new Promise(requestAnimationFrame);
      values.push({
        elapsed: performance.now() - startedAt,
        autoBg: getComputedStyle(auto).backgroundColor,
        autoColor: getComputedStyle(auto).color,
        lightBg: getComputedStyle(light).backgroundColor,
        lightColor: getComputedStyle(light).color,
        autoInlineBg: auto.style.backgroundColor,
        lightInlineBg: light.style.backgroundColor,
        autoChecked: auto.getAttribute('aria-checked'),
        lightChecked: light.getAttribute('aria-checked'),
      });
      if (!auto.style.backgroundColor && !light.style.backgroundColor
        && performance.now() - startedAt > 120) break;
    }
    return { initial, values };
  });
  expect(segmentSamples.values.length).toBeGreaterThan(2);
  expect(segmentSamples.values[0].autoChecked).toBe('false');
  expect(segmentSamples.values[0].lightChecked).toBe('true');
  const segmentMid = segmentSamples.values.find(sample =>
    sample.elapsed > 20 && sample.elapsed < 180
      && sample.autoInlineBg !== '' && sample.lightInlineBg !== ''
      && sample.autoBg !== segmentSamples.initial.autoBg
      && sample.lightBg !== segmentSamples.initial.lightBg);
  expect(segmentMid).toBeTruthy();
  const segmentTerminal = segmentSamples.values.at(-1);
  expect(segmentTerminal.autoInlineBg).toBe('');
  expect(segmentTerminal.lightInlineBg).toBe('');
  expect(segmentTerminal.autoBg).not.toBe(segmentSamples.initial.autoBg);
  expect(segmentTerminal.lightBg).not.toBe(segmentSamples.initial.lightBg);

  const switchSamples = await host.evaluate(async element => {
    const root = element.shadowRoot;
    const control = root?.querySelector('#wakeSwitch');
    const thumb = root?.querySelector('#wakeSwitch .switch-thumb');
    if (!(control instanceof HTMLButtonElement) || !(thumb instanceof HTMLElement))
      throw new Error('Reverb settings switch is unavailable');
    control.click();
    const startedAt = performance.now();
    const values = [];
    while (performance.now() - startedAt < 350) {
      await new Promise(requestAnimationFrame);
      const transform = getComputedStyle(thumb).transform;
      values.push({
        elapsed: performance.now() - startedAt,
        x: transform === 'none' ? 0 : new DOMMatrix(transform).m41,
        track: getComputedStyle(control).backgroundColor,
        thumb: getComputedStyle(thumb).backgroundColor,
        inlineTrack: control.style.backgroundColor,
        inlineThumb: thumb.style.backgroundColor,
        inlineTransform: thumb.style.transform,
        checked: control.getAttribute('aria-checked'),
      });
      if (!thumb.style.transform && performance.now() - startedAt > 120) break;
    }
    return values;
  });
  expect(switchSamples.length).toBeGreaterThan(2);
  expect(switchSamples[0].checked).toBe('true');
  const switchMid = switchSamples.find(sample =>
    sample.elapsed > 20 && sample.elapsed < 150 && sample.x > 0.5 && sample.x < 17.5);
  expect(switchMid).toBeTruthy();
  const omega = Math.sqrt(1500);
  const t = switchMid.elapsed / 1000;
  const expectedProgress = 1 - (1 + omega * t) * Math.exp(-omega * t);
  expect(switchMid.x).toBeCloseTo(18 * expectedProgress, 0);
  expect(switchMid.inlineTrack).not.toBe('');
  expect(switchMid.inlineThumb).not.toBe('');
  const switchTerminal = switchSamples.at(-1);
  expect(switchTerminal.x).toBeCloseTo(18, 1);
  expect(switchTerminal.inlineTrack).toBe('');
  expect(switchTerminal.inlineThumb).toBe('');
  expect(switchTerminal.inlineTransform).toBe('');

  const dropdownSamples = await host.evaluate(async element => {
    const root = element.shadowRoot;
    const field = root?.querySelector('.settings-card.dropdown');
    if (!(field instanceof HTMLButtonElement))
      throw new Error('Reverb settings dropdown is unavailable');
    const initial = getComputedStyle(field).backgroundColor;
    field.click();
    const startedAt = performance.now();
    const values = [];
    while (performance.now() - startedAt < 350) {
      await new Promise(requestAnimationFrame);
      values.push({
        elapsed: performance.now() - startedAt,
        background: getComputedStyle(field).backgroundColor,
        inlineBackground: field.style.backgroundColor,
        expanded: field.getAttribute('aria-expanded'),
      });
      if (!field.style.backgroundColor && performance.now() - startedAt > 120) break;
    }
    return { initial, values };
  });
  expect(dropdownSamples.values[0].expanded).toBe('true');
  const dropdownMid = dropdownSamples.values.find(sample =>
    sample.elapsed > 20 && sample.elapsed < 180
      && sample.inlineBackground !== ''
      && sample.background !== dropdownSamples.initial);
  expect(dropdownMid).toBeTruthy();
  const dropdownTerminal = dropdownSamples.values.at(-1);
  expect(dropdownTerminal.inlineBackground).toBe('');
  expect(dropdownTerminal.background).not.toBe(dropdownSamples.initial);
});

test('Reverb Settings dropdown uses native Material3 menu springs and retained exit', async ({ page }, info) => {
  const host = await visitReverb(page, info);
  await host.locator('#openSettings').click();
  await expect(host.locator('#settingsScreen')).toHaveClass(/active/);
  await page.waitForTimeout(260);

  const result = await host.evaluate(async element => {
    const root = element.shadowRoot;
    const field = root?.querySelector('.settings-card.dropdown');
    const menu = root?.querySelector('#dropdownMenu');
    if (!(field instanceof HTMLButtonElement) || !(menu instanceof HTMLElement))
      throw new Error('Reverb settings dropdown is unavailable');

    const read = () => {
      const style = getComputedStyle(menu);
      const matrix = style.transform === 'none' ? new DOMMatrix() : new DOMMatrix(style.transform);
      const origin = style.transformOrigin.split(' ').map(Number.parseFloat);
      return {
        show: menu.classList.contains('show'),
        hidden: menu.getAttribute('aria-hidden'),
        expanded: field.getAttribute('aria-expanded'),
        scale: matrix.a,
        opacity: Number(style.opacity),
        originX: origin[0] ?? 0,
        originY: origin[1] ?? 0,
        width: menu.offsetWidth,
      };
    };

    field.click();
    const opened = read();
    const openStartedAt = performance.now();
    const openSamples = [];
    while (performance.now() - openStartedAt < 170) {
      await new Promise(requestAnimationFrame);
      openSamples.push({ elapsed: performance.now() - openStartedAt, ...read() });
    }

    const focused = root?.activeElement;
    if (!(focused instanceof HTMLElement) || !menu.contains(focused))
      throw new Error('Dropdown did not own focus');
    focused.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    const closing = read();
    const closeStartedAt = performance.now();
    const closeSamples = [];
    while (menu.classList.contains('show') && performance.now() - closeStartedAt < 350) {
      await new Promise(requestAnimationFrame);
      closeSamples.push({ elapsed: performance.now() - closeStartedAt, ...read() });
    }
    const closed = read();

    field.click();
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
    const reopeningStart = read();
    const openItem = menu.querySelector('.dropdown-item');
    if (!(openItem instanceof HTMLElement)) throw new Error('Dropdown item is unavailable');
    openItem.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await new Promise(requestAnimationFrame);
    const reversingOut = read();
    field.click();
    const reversingIn = read();
    await new Promise(resolve => setTimeout(resolve, 180));
    const reopened = read();

    return {
      opened,
      openSamples,
      closing,
      closeSamples,
      closed,
      reopeningStart,
      reversingOut,
      reversingIn,
      reopened,
    };
  });

  expect(result.opened.show).toBe(true);
  expect(result.opened.hidden).toBe('false');
  expect(result.opened.expanded).toBe('true');
  expect(result.opened.scale).toBeCloseTo(0.8, 2);
  expect(result.opened.opacity).toBeCloseTo(0, 2);
  expect(result.opened.originX / result.opened.width).toBeCloseTo(0.5, 1);
  expect(result.opened.originY).toBeCloseTo(0, 1);

  const openMid = result.openSamples.find(sample => sample.elapsed >= 15 && sample.elapsed <= 70);
  expect(openMid).toBeTruthy();
  const openSeconds = openMid.elapsed / 1000;
  const scaleOmega = Math.sqrt(1400);
  const scaleDampedOmega = scaleOmega * Math.sqrt(1 - 0.9 ** 2);
  const scaleDisplacement = -0.2;
  const scaleAt = seconds => {
    const scaleDecay = Math.exp(-0.9 * scaleOmega * seconds);
    const scaleSine = (0.9 * scaleOmega * scaleDisplacement) / scaleDampedOmega;
    return 1 + scaleDecay * (
      scaleDisplacement * Math.cos(scaleDampedOmega * seconds)
        + scaleSine * Math.sin(scaleDampedOmega * seconds)
    );
  };
  const expectedOpenScale = scaleAt(openSeconds);
  expect(openMid.scale).toBeCloseTo(expectedOpenScale, 1);

  // Both native Material3 channels are advanced from the same animation clock. Browser
  // scheduling can delay this test's RAF callback relative to the runtime callback, so infer
  // that shared spring instant from the observed scale instead of comparing across two clocks.
  let inferredSeconds = 0;
  let inferredScaleError = Number.POSITIVE_INFINITY;
  for (let milliseconds = 0; milliseconds <= 120; milliseconds += 0.25) {
    const seconds = milliseconds / 1000;
    const error = Math.abs(scaleAt(seconds) - openMid.scale);
    if (error < inferredScaleError) {
      inferredScaleError = error;
      inferredSeconds = seconds;
    }
  }
  const alphaOmega = Math.sqrt(3800);
  const expectedOpenAlpha = 1 -
    (1 + alphaOmega * inferredSeconds) * Math.exp(-alphaOmega * inferredSeconds);
  expect(inferredScaleError).toBeLessThan(0.002);
  expect(Math.abs(openMid.opacity - expectedOpenAlpha)).toBeLessThan(0.04);
  expect(result.openSamples.at(-1).scale).toBeCloseTo(1, 2);
  expect(result.openSamples.at(-1).opacity).toBeCloseTo(1, 2);

  expect(result.closing.show).toBe(true);
  expect(result.closing.hidden).toBe('false');
  expect(result.closing.expanded).toBe('false');
  const closeMid = result.closeSamples.find(sample => sample.elapsed >= 15 && sample.elapsed <= 70);
  expect(closeMid).toBeTruthy();
  expect(closeMid.show).toBe(true);
  expect(closeMid.scale).toBeLessThan(1);
  expect(closeMid.scale).toBeGreaterThan(0.8);
  expect(closeMid.opacity).toBeLessThan(1);
  expect(closeMid.opacity).toBeGreaterThan(0);
  expect(result.closed.show).toBe(false);
  expect(result.closed.hidden).toBe('true');
  expect(result.closed.opacity).toBeCloseTo(0, 2);

  expect(result.reopeningStart.show).toBe(true);
  expect(result.reversingOut.show).toBe(true);
  expect(result.reversingIn.show).toBe(true);
  expect(result.reopened.show).toBe(true);
  expect(result.reopened.hidden).toBe('false');
  expect(result.reopened.expanded).toBe('true');
  expect(result.reopened.scale).toBeCloseTo(1, 2);
  expect(result.reopened.opacity).toBeCloseTo(1, 2);
});

test('Reverb recording long-press uses native Material3 menu motion without collapsing inline playback', async ({ page }, info) => {
  const host = await visitReverb(page, info);
  await host.locator('#openLibrary').click();
  await page.waitForTimeout(260);
  const summary = host.locator('.recording-summary').first();
  await summary.click();
  await page.waitForTimeout(360);
  await expect(summary).toHaveAttribute('aria-expanded', 'true');

  const result = await host.evaluate(async element => {
    const root = element.shadowRoot;
    const summary = root?.querySelector('.recording-summary');
    const card = summary?.closest('.recording-card');
    const menu = root?.querySelector('#recordingMenu');
    if (!(summary instanceof HTMLButtonElement) || !(card instanceof HTMLElement)
      || !(menu instanceof HTMLElement)) throw new Error('Reverb recording menu surfaces are unavailable');
    const read = () => {
      const style = getComputedStyle(menu);
      const matrix = style.transform === 'none' ? new DOMMatrix() : new DOMMatrix(style.transform);
      return {
        show: menu.classList.contains('show'),
        hidden: menu.getAttribute('aria-hidden'),
        scale: matrix.a,
        opacity: Number(style.opacity),
        expanded: card.classList.contains('expanded'),
        focus: root?.activeElement?.textContent?.trim() ?? '',
        labels: [...menu.querySelectorAll('.recording-menu-item')].map(item => item.textContent?.trim() ?? ''),
      };
    };
    summary.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    const opened = read();
    const startedAt = performance.now();
    const samples = [];
    while (performance.now() - startedAt < 180) {
      await new Promise(requestAnimationFrame);
      samples.push({ elapsed: performance.now() - startedAt, ...read() });
    }
    const focused = menu.querySelector(':focus');
    if (!(focused instanceof HTMLElement)) throw new Error('Recording menu did not own focus');
    focused.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    const closing = read();
    const closeStartedAt = performance.now();
    const closeSamples = [];
    while (menu.classList.contains('show') && performance.now() - closeStartedAt < 350) {
      await new Promise(requestAnimationFrame);
      closeSamples.push({ elapsed: performance.now() - closeStartedAt, ...read() });
    }
    return { opened, samples, closing, closeSamples, closed: read() };
  });

  expect(result.opened.show).toBe(true);
  expect(result.opened.hidden).toBe('false');
  expect(result.opened.scale).toBeCloseTo(0.8, 2);
  expect(result.opened.opacity).toBeCloseTo(0, 2);
  expect(result.opened.expanded).toBe(true);
  expect(result.opened.labels).toEqual(['Rename', 'Info', 'Share', 'Trim', 'Delete', 'Multi-select']);
  const openMid = result.samples.find(sample => sample.elapsed >= 15 && sample.elapsed <= 80
    && sample.scale > 0.8 && sample.scale < 1 && sample.opacity > 0 && sample.opacity < 1);
  expect(openMid).toBeTruthy();
  expect(result.samples.every(sample => sample.expanded)).toBe(true);
  expect(result.closing.show).toBe(true);
  const closeMid = result.closeSamples.find(sample => sample.elapsed >= 15 && sample.elapsed <= 80
    && sample.scale > 0.8 && sample.scale < 1 && sample.opacity > 0 && sample.opacity < 1);
  expect(closeMid).toBeTruthy();
  expect(result.closeSamples.every(sample => sample.expanded)).toBe(true);
  expect(result.closed.show).toBe(false);
  expect(result.closed.hidden).toBe('true');
  expect(result.closed.expanded).toBe(true);
  await expect(summary).toBeFocused();
});

test('Reverb recording Rename and Info actions transfer menu ownership into native action sheets', async ({ page }, info) => {
  const host = await visitReverb(page, info);
  await host.locator('#openLibrary').click();
  await page.waitForTimeout(260);
  const summary = host.locator('.recording-summary').first();
  const card = host.locator('.recording-card').first();
  const title = card.locator('.recording-title');
  await summary.click();
  await page.waitForTimeout(360);
  await expect(summary).toHaveAttribute('aria-expanded', 'true');

  await summary.dispatchEvent('contextmenu');
  await host.locator('#recordingMenu').getByRole('menuitem', { name: 'Rename' }).click();
  const sheet = host.locator('#actionSheet');
  await expect(sheet).toHaveAttribute('data-mode', 'recording-rename');
  await expect(host.locator('#actionSheetTitle')).toHaveText('Rename');
  await expect(summary).toHaveAttribute('aria-expanded', 'false');
  const input = host.locator('.recording-rename-field');
  await expect(input).toHaveValue('1789539200534');
  await input.fill('field-note');
  await host.locator('#actionSheetConfirm').click();
  await expect(sheet).toBeHidden();
  await expect(title).toHaveText('field-note.wav');
  await expect(summary).toBeFocused();

  await summary.dispatchEvent('contextmenu');
  await host.locator('#recordingMenu').getByRole('menuitem', { name: 'Info' }).click();
  await expect(sheet).toHaveAttribute('data-mode', 'recording-info');
  await expect(host.locator('#actionSheetTitle')).toHaveText('Info');
  const infoSheet = host.locator('#actionSheetCustom');
  await expect(infoSheet).toContainText('field-note.wav');
  await expect(infoSheet).toContainText('Started');
  await expect(infoSheet).toContainText('16 September 2026');
  await expect(infoSheet).toContainText('Duration');
  await expect(infoSheet).toContainText('10m 0s');
  await expect(infoSheet).toContainText('Size');
  await expect(infoSheet).toContainText('50.5 MiB');
  await expect(infoSheet).toContainText('Codec');
  await expect(infoSheet).toContainText('WAV · PCM 16-bit · Mono · 44.1 kHz');
  await expect(infoSheet).toContainText('MIME');
  await expect(infoSheet).toContainText('audio/wav');
  await expect(infoSheet).toContainText('Storage');
  await expect(infoSheet).toContainText('FILE');
  await expect(infoSheet).toContainText('Location');
  await expect(infoSheet).toContainText('Music/Reverb/field-note.wav');
  await expect(host.locator('#actionSheetCancel')).toBeHidden();
  await expect(host.locator('#actionSheetConfirmLabel')).toHaveText('Close');
  await host.locator('#actionSheetConfirm').click();
  await expect(sheet).toBeHidden();
  await expect(summary).toBeFocused();
});

test('Reverb Library multi-select uses the native selection top bar and predictive Back motion', async ({ page }, info) => {
  const host = await visitReverb(page, info);
  await host.locator('#openLibrary').click();
  await page.waitForTimeout(260);
  const summaries = host.locator('.recording-summary');
  const first = summaries.nth(0);
  const second = summaries.nth(1);

  await first.dispatchEvent('contextmenu');
  await host.locator('#recordingMenu').getByRole('menuitem', { name: 'Multi-select' }).click();
  const selectionBar = host.locator('#librarySelectionBar');
  await expect(selectionBar).toBeVisible();
  await expect(host.locator('#librarySelectionTitle')).toHaveText('1 selected');
  await expect(first).toHaveAttribute('aria-pressed', 'true');
  await expect(host.locator('.recording-card').nth(0)).toHaveClass(/selected/);

  await second.click();
  await expect(host.locator('#librarySelectionTitle')).toHaveText('2 selected');
  await expect(second).toHaveAttribute('aria-pressed', 'true');
  await expect(second).toHaveAttribute('aria-expanded', 'false');

  const samples = await host.evaluate(async element => {
    const root = element.shadowRoot;
    const bar = root?.querySelector('#librarySelectionBar');
    const normal = root?.querySelector('#libraryScreen > .topbar');
    const library = root?.querySelector('#libraryScreen');
    if (!(bar instanceof HTMLElement) || !(normal instanceof HTMLElement)
      || !(library instanceof HTMLElement)) throw new Error('Library selection surfaces are unavailable');
    const target = root?.activeElement instanceof HTMLElement ? root.activeElement : bar;
    target.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Escape', bubbles: true, composed: true, cancelable: true,
    }));
    const startedAt = performance.now();
    const values = [];
    while (performance.now() - startedAt < 500) {
      await new Promise(requestAnimationFrame);
      const style = getComputedStyle(bar);
      const matrix = style.transform === 'none' ? new DOMMatrix() : new DOMMatrix(style.transform);
      values.push({
        elapsed: performance.now() - startedAt,
        hidden: bar.hidden,
        x: matrix.m41 / Math.max(1, bar.getBoundingClientRect().width),
        scale: matrix.a,
        opacity: Number(style.opacity),
        normalVisibility: getComputedStyle(normal).visibility,
        libraryActive: library.classList.contains('active'),
        title: root?.querySelector('#librarySelectionTitle')?.textContent ?? '',
        focusClass: root?.activeElement?.className ?? '',
      });
      if (bar.hidden) break;
    }
    return values;
  });

  const mid = samples.find(sample => !sample.hidden && sample.x > 0.08 && sample.x < 0.92);
  expect(mid).toBeTruthy();
  expect(mid.opacity).toBeLessThan(1);
  expect(mid.opacity).toBeGreaterThanOrEqual(0.82);
  expect(mid.scale).toBeLessThan(1);
  expect(mid.scale).toBeGreaterThanOrEqual(0.985);
  expect(mid.normalVisibility).toBe('visible');
  expect(samples.filter(sample => !sample.hidden).every(sample => sample.libraryActive)).toBe(true);
  expect(samples.at(-1).hidden).toBe(true);
  expect(samples.at(-1).libraryActive).toBe(true);
  expect(samples.at(-1).elapsed).toBeGreaterThanOrEqual(190);
  expect(samples.at(-1).elapsed).toBeLessThan(360);
  await expect(first).toBeFocused();
});

test('Reverb inline fine seek preserves puck taps, shuttles the timeline, and springs home', async ({ page }, info) => {
  const host = await visitReverb(page, info);
  await host.locator('#openLibrary').click();
  await page.waitForTimeout(260);
  const summary = host.locator('.recording-summary').first();
  await summary.click();
  await page.waitForTimeout(360);

  const result = await host.evaluate(async element => {
    const root = element.shadowRoot;
    const card = root?.querySelector('.recording-card.expanded');
    const fine = card?.querySelector('.recording-fine');
    const play = card?.querySelector('.recording-play');
    const position = card?.querySelector('.recording-player-times .position');
    const field = card?.querySelector('.recording-fine-path');
    if (!(fine instanceof HTMLElement) || !(play instanceof HTMLButtonElement)
      || !(position instanceof HTMLElement) || !(field instanceof SVGPathElement))
      throw new Error('Inline fine-seek surfaces are unavailable');
    const rect = fine.getBoundingClientRect();
    const cx = rect.left + rect.width * 0.5;
    const cy = rect.top + rect.height * 0.5;
    const pointer = (type, id, x, y, buttons) => new PointerEvent(type, {
      bubbles: true, cancelable: true, pointerId: id, pointerType: 'touch',
      isPrimary: true, button: 0, buttons, clientX: x, clientY: y,
    });

    // Native starts expanded playback. Pause so fine movement is isolated from playback time.
    play.click();
    const beforeTap = play.getAttribute('aria-label');
    fine.dispatchEvent(pointer('pointerdown', 701, cx, cy, 1));
    fine.dispatchEvent(pointer('pointerup', 701, cx, cy, 0));
    play.click();
    const afterTap = play.getAttribute('aria-label');
    play.click();
    const beforeDrag = play.getAttribute('aria-label');
    const beforePosition = position.textContent ?? '';
    const beforePath = field.getAttribute('d') ?? '';

    fine.dispatchEvent(pointer('pointerdown', 702, cx, cy, 1));
    fine.dispatchEvent(pointer(
      'pointermove', 702,
      rect.right - rect.width * 0.04,
      rect.top + rect.height * 0.18,
      1,
    ));
    for (let index = 0; index < 10; index++) await new Promise(requestAnimationFrame);
    const duringTransform = getComputedStyle(play).transform;
    const duringPath = field.getAttribute('d') ?? '';
    const duringPosition = position.textContent ?? '';
    fine.dispatchEvent(pointer(
      'pointerup', 702,
      rect.right - rect.width * 0.04,
      rect.top + rect.height * 0.18,
      0,
    ));
    // A browser click follows a puck drag. Native consumes it instead of toggling playback.
    play.click();
    const afterSuppressedClick = play.getAttribute('aria-label');

    const settleStarted = performance.now();
    const settle = [];
    while (performance.now() - settleStarted < 340) {
      await new Promise(requestAnimationFrame);
      const transform = getComputedStyle(play).transform;
      const matrix = transform === 'none' ? new DOMMatrix() : new DOMMatrix(transform);
      settle.push({
        elapsed: performance.now() - settleStarted,
        x: matrix.m41,
        y: matrix.m42,
      });
    }
    fine.dispatchEvent(pointer('pointerdown', 703, cx, cy, 1));
    fine.dispatchEvent(pointer('pointermove', 703, rect.left + rect.width * 0.08, cy, 1));
    await new Promise(requestAnimationFrame);
    const draggingBeforeBlur = fine.classList.contains('is-dragging');
    window.dispatchEvent(new Event('blur'));
    await new Promise(requestAnimationFrame);
    const draggingAfterBlur = fine.classList.contains('is-dragging');
    for (let index = 0; index < 16; index++) await new Promise(requestAnimationFrame);
    const blurTransform = getComputedStyle(play).transform;
    const blurMatrix = blurTransform === 'none' ? new DOMMatrix() : new DOMMatrix(blurTransform);
    return {
      beforeTap, afterTap, beforeDrag, beforePosition, duringPosition,
      beforePath, duringPath, duringTransform, afterSuppressedClick, settle,
      draggingBeforeBlur, draggingAfterBlur, blurX: blurMatrix.m41, blurY: blurMatrix.m42,
    };
  });

  expect(result.beforeTap).toBe('Play');
  expect(result.afterTap).toBe('Pause');
  expect(result.beforeDrag).toBe('Play');
  expect(result.duringTransform).not.toBe('none');
  expect(result.duringPath).not.toBe(result.beforePath);
  expect(result.duringPosition).not.toBe(result.beforePosition);
  expect(result.afterSuppressedClick).toBe('Play');
  const middle = result.settle.find(sample => sample.elapsed >= 80 && sample.elapsed <= 150);
  expect(middle).toBeTruthy();
  expect(Math.hypot(middle.x, middle.y)).toBeGreaterThan(0.2);
  const terminal = result.settle.at(-1);
  expect(Math.abs(terminal.x)).toBeLessThan(0.05);
  expect(Math.abs(terminal.y)).toBeLessThan(0.05);
  expect(result.draggingBeforeBlur).toBe(true);
  expect(result.draggingAfterBlur).toBe(false);
  expect(Math.abs(result.blurX)).toBeLessThan(0.05);
  expect(Math.abs(result.blurY)).toBeLessThan(0.05);
});

test('Reverb recording waveform scrub transfers trim-boundary ownership and preserves the 50ms minimum', async ({ page }, info) => {
  const host = await visitReverb(page, info);
  await host.locator('#openLibrary').click();
  await page.waitForTimeout(260);
  const summary = host.locator('.recording-summary').first();
  await summary.dispatchEvent('contextmenu');
  await host.locator('#recordingMenu').getByRole('menuitem', { name: 'Trim' }).click();
  await page.waitForTimeout(380);

  const result = await host.evaluate(element => {
    const root = element.shadowRoot;
    const card = root?.querySelector('.recording-card.expanded');
    const wave = card?.querySelector('.recording-player-wave');
    const start = card?.querySelector('.recording-trim-boundary.start');
    const end = card?.querySelector('.recording-trim-boundary.end');
    const startLabel = card?.querySelector('.recording-player-times .position');
    const endLabel = card?.querySelector('.recording-player-times .duration');
    if (!(wave instanceof HTMLElement) || !(start instanceof HTMLElement)
      || !(end instanceof HTMLElement) || !(startLabel instanceof HTMLElement)
      || !(endLabel instanceof HTMLElement))
      throw new Error('Inline trim waveform surfaces are unavailable');
    const rect = wave.getBoundingClientRect();
    const pointer = (type, id, fraction, buttons) => new PointerEvent(type, {
      bubbles: true, cancelable: true, pointerId: id, pointerType: 'touch',
      isPrimary: true, button: 0, buttons,
      clientX: rect.left + rect.width * fraction,
      clientY: rect.top + rect.height * 0.5,
    });

    // Away from both handles, native keeps the currently active start boundary.
    wave.dispatchEvent(pointer('pointerdown', 711, 0.25, 1));
    wave.dispatchEvent(pointer('pointerup', 711, 0.25, 0));
    const afterStart = {
      start: Number.parseFloat(start.style.left),
      end: Number.parseFloat(end.style.left),
      startLabel: startLabel.textContent ?? '',
      endLabel: endLabel.textContent ?? '',
      startActive: start.classList.contains('active'),
      endActive: end.classList.contains('active'),
    };

    // Press within the native 24dp end-handle radius, then cross the start boundary.
    // adjustInlineTrimTarget must move the start with it and retain a 50ms range.
    wave.dispatchEvent(pointer('pointerdown', 712, 0.99, 1));
    wave.dispatchEvent(pointer('pointermove', 712, 0.25, 1));
    wave.dispatchEvent(pointer('pointerup', 712, 0.25, 0));
    const afterEnd = {
      start: Number.parseFloat(start.style.left),
      end: Number.parseFloat(end.style.left),
      startLabel: startLabel.textContent ?? '',
      endLabel: endLabel.textContent ?? '',
      startActive: start.classList.contains('active'),
      endActive: end.classList.contains('active'),
    };
    return { afterStart, afterEnd };
  });

  expect(result.afterStart.start).toBeCloseTo(25, 0);
  expect(result.afterStart.end).toBeCloseTo(100, 1);
  expect(result.afterStart.startActive).toBe(true);
  expect(result.afterStart.endActive).toBe(false);
  expect(result.afterStart.startLabel).toBe('2:30.0');
  expect(result.afterEnd.endActive).toBe(true);
  expect(result.afterEnd.startActive).toBe(false);
  expect(result.afterEnd.end).toBeGreaterThan(result.afterEnd.start);
  expect(result.afterEnd.end - result.afterEnd.start).toBeGreaterThan(0);
  expect(result.afterEnd.end - result.afterEnd.start).toBeLessThan(0.02);
});

test('Reverb recording Trim stays inline and consumes Back before player collapse', async ({ page }, info) => {
  const host = await visitReverb(page, info);
  await host.locator('#openLibrary').click();
  await page.waitForTimeout(260);
  const card = host.locator('.recording-card').first();
  const summary = card.locator('.recording-summary');
  await summary.dispatchEvent('contextmenu');
  await host.locator('#recordingMenu').getByRole('menuitem', { name: 'Trim' }).click();
  await page.waitForTimeout(380);

  const player = card.locator('.recording-player');
  await expect(card).toHaveClass(/expanded/);
  await expect(summary).toHaveAttribute('aria-expanded', 'true');
  await expect(player).toHaveClass(/trim-mode/);
  await expect(card.locator('.recording-trim-head')).toBeVisible();
  await expect(card.locator('.recording-trim-duration')).toHaveText('10:00.0');
  await expect(card.locator('.recording-player-times .position')).toHaveText('0:00.0');
  await expect(card.locator('.recording-player-times .duration')).toHaveText('10:00.0');
  await expect(card.locator('.recording-play')).toHaveAttribute('aria-label', 'Play');
  const fineHeight = await card.locator('.recording-fine').evaluate(node => node.offsetHeight);
  expect(fineHeight).toBeCloseTo(104, 0);
  await expect(card.locator('.recording-trim-actions')).toBeVisible();

  const samples = await host.evaluate(async element => {
    const root = element.shadowRoot;
    const card = root?.querySelector('.recording-card.expanded');
    const player = card?.querySelector('.recording-player');
    const header = card?.querySelector('.recording-trim-head');
    const fine = card?.querySelector('.recording-fine');
    if (!(card instanceof HTMLElement) || !(player instanceof HTMLElement)
      || !(header instanceof HTMLElement) || !(fine instanceof HTMLElement))
      throw new Error('Trim surfaces are unavailable');
    player.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Escape', bubbles: true, composed: true, cancelable: true,
    }));
    const startedAt = performance.now();
    const values = [];
    while (performance.now() - startedAt < 500) {
      await new Promise(requestAnimationFrame);
      const matrix = getComputedStyle(player).transform === 'none'
        ? new DOMMatrix() : new DOMMatrix(getComputedStyle(player).transform);
      values.push({
        elapsed: performance.now() - startedAt,
        trim: player.classList.contains('trim-mode'),
        expanded: card.classList.contains('expanded'),
        x: matrix.m41 / Math.max(1, player.getBoundingClientRect().width),
        headerOpacity: Number(getComputedStyle(header).opacity),
        fineOpacity: Number(getComputedStyle(fine).opacity),
        focusClass: root?.activeElement?.className ?? '',
      });
      if (!player.classList.contains('trim-mode')) break;
    }
    return values;
  });

  const mid = samples.find(sample => sample.trim && sample.x > 0.01 && sample.x < 0.075);
  expect(mid).toBeTruthy();
  expect(mid.headerOpacity).toBeLessThan(1);
  expect(mid.fineOpacity).toBeLessThan(1);
  expect(samples.filter(sample => sample.trim).every(sample => sample.expanded)).toBe(true);
  expect(samples.at(-1).elapsed).toBeGreaterThanOrEqual(190);
  expect(samples.at(-1).elapsed).toBeLessThan(360);
  expect(samples.at(-1).trim).toBe(false);
  expect(samples.at(-1).expanded).toBe(true);
  await expect(card.locator('.recording-play')).toBeFocused();
  await page.waitForTimeout(360);
  const restoredFineHeight = await card.locator('.recording-fine').evaluate(node => node.offsetHeight);
  expect(restoredFineHeight).toBeCloseTo(120, 0);

  await card.locator('.recording-play').press('Escape');
  await page.waitForTimeout(280);
  await expect(card).not.toHaveClass(/expanded/);
  await expect(host.locator('#libraryScreen')).toHaveClass(/active/);
});

test('Reverb Library Delete follows native pending-delete and Undo transaction', async ({ page }, info) => {
  const host = await visitReverb(page, info);
  await host.locator('#openLibrary').click();
  await page.waitForTimeout(260);
  const card = host.locator('.recording-card').first();
  const summary = card.locator('.recording-summary');
  const firstHeader = host.locator('.date-header').first();
  const recordingId = await card.getAttribute('data-recording');
  expect(recordingId).toBeTruthy();

  await summary.click();
  await page.waitForTimeout(340);
  await expect(summary).toHaveAttribute('aria-expanded', 'true');
  await summary.dispatchEvent('contextmenu');
  await host.locator('#recordingMenu').getByRole('menuitem', { name: 'Delete' }).click();

  const deleted = host.locator(`.recording-card[data-recording="${recordingId}"]`);
  await expect(deleted).toHaveCount(0);
  await expect(firstHeader).toBeHidden();
  const notice = host.locator('#libraryNotice');
  await expect(notice).toBeVisible();
  await expect(host.locator('#libraryNoticeMessage')).toHaveText('Recording deleted.');
  await expect(host.locator('#libraryNoticeUndo')).toBeVisible();
  await expect(host.locator('#librarySelectionBar')).toBeHidden();

  await host.locator('#libraryNoticeUndo').click();
  const restored = host.locator(`.recording-card[data-recording="${recordingId}"]`);
  await expect(restored).toHaveCount(1);
  await expect(firstHeader).toBeVisible();
  await expect(restored.locator('.recording-summary')).toBeFocused();
  await expect(notice).toBeHidden({ timeout: 1200 });

  const restoredSummary = restored.locator('.recording-summary');
  await restoredSummary.dispatchEvent('contextmenu');
  await host.locator('#recordingMenu').getByRole('menuitem', { name: 'Delete' }).click();
  await expect(restored).toHaveCount(0);
  await expect(notice).toBeVisible();
  await page.waitForTimeout(4700);
  await expect(notice).toBeHidden({ timeout: 1200 });
  await expect(host.locator(`.recording-card[data-recording="${recordingId}"]`)).toHaveCount(0);
  await expect(firstHeader).toBeHidden();
});

test('Reverb full-buffer export uses the native Export limit action sheet before clamped save', async ({ page }, info) => {
  const host = await visitReverb(page, info);
  await host.locator('.buffer-segment[data-buffer="loop"]').click();
  await page.waitForTimeout(320);
  await expect(host.locator('.buffer-segment[data-buffer="loop"]')).toHaveAttribute('aria-selected', 'true');
  await host.locator('#exportFull').click();

  const sheet = host.locator('#actionSheet');
  await expect(sheet).toHaveAttribute('data-mode', 'export-limit');
  await expect(sheet).toHaveAttribute('aria-hidden', 'false');
  await expect(host.locator('#actionSheetTitle')).toHaveText('Export limit');
  await expect(host.locator('#actionSheetMessage')).toHaveText(
    'Current length is too large. Only exporting last 13:31:35.',
  );
  await expect(host.locator('#actionSheetConfirmLabel')).toHaveText('Export');
  await expect(host.locator('#actionSheetConfirmIcon')).toBeHidden();
  await expect(host.locator('#homeScreen')).toHaveAttribute('aria-hidden', 'true');

  await host.locator('#actionSheetCancel').click();
  await expect(sheet).toBeHidden();
  await expect(host.locator('#captureSaveStatus')).toBeHidden();
  await expect(host.locator('#exportFull')).toBeFocused();

  await host.locator('#exportFull').click();
  await expect(sheet).toHaveAttribute('data-mode', 'export-limit');
  await page.waitForTimeout(420);
  await host.locator('#actionSheetConfirm').click();
  await expect(sheet).toBeHidden();
  await expect(host.locator('#captureSaveStatus')).toBeVisible();
  await expect(host.locator('#captureSaveTitle')).toHaveText('Saving');
  await page.waitForTimeout(1300);
  await expect(host.locator('#captureSaveStatus')).toHaveClass(/saved/);
  await expect(host.locator('#captureSaveSubtitle')).toContainText('13h 31m');
});

test('Reverb Clear uses the native Material3 sheet lifetime and transfers accepted work to progress', async ({ page }, info) => {
  const host = await visitReverb(page, info);
  const opening = await host.evaluate(async element => {
    const root = element.shadowRoot;
    const blob = root?.querySelector('#blobControl');
    const clear = root?.querySelector('#clearBuffer');
    const sheet = root?.querySelector('#actionSheet');
    const scrim = root?.querySelector('#actionSheetScrim');
    const home = root?.querySelector('#homeScreen');
    if (!(blob instanceof HTMLButtonElement) || !(clear instanceof HTMLButtonElement)
      || !(sheet instanceof HTMLElement) || !(scrim instanceof HTMLElement)
      || !(home instanceof HTMLElement))
      throw new Error('Reverb Clear sheet surfaces are unavailable');
    blob.click();
    if (clear.disabled) throw new Error('Clear did not enable after capture stopped');
    const read = () => {
      const transform = getComputedStyle(sheet).transform;
      const matrix = transform === 'none' ? new DOMMatrix() : new DOMMatrix(transform);
      return {
        hidden: sheet.hidden,
        mode: sheet.dataset.mode ?? '',
        y: matrix.m42,
        height: sheet.offsetHeight,
        scrim: Number(getComputedStyle(scrim).opacity),
        ariaHidden: sheet.getAttribute('aria-hidden'),
        inert: sheet.inert,
        homeInert: home.inert,
        homeAriaHidden: home.getAttribute('aria-hidden'),
        focusId: root?.activeElement?.id ?? '',
      };
    };
    clear.click();
    const initial = read();
    const startedAt = performance.now();
    const samples = [];
    while (performance.now() - startedAt < 650) {
      await new Promise(requestAnimationFrame);
      samples.push({ elapsed: performance.now() - startedAt, ...read() });
      if (samples.at(-1).height > 0 && Math.abs(samples.at(-1).y) < 0.05
        && samples.at(-1).scrim > 0.319) break;
    }
    return { initial, samples };
  });

  expect(opening.initial.hidden).toBe(false);
  expect(opening.initial.mode).toBe('clear-confirm');
  expect(opening.initial.ariaHidden).toBe('false');
  expect(opening.initial.inert).toBe(false);
  expect(opening.initial.homeInert).toBe(true);
  expect(opening.initial.homeAriaHidden).toBe('true');
  expect(opening.initial.y / opening.initial.height).toBeGreaterThan(0.95);
  expect(opening.initial.scrim).toBeCloseTo(0, 2);
  const entryMid = opening.samples.find(sample =>
    sample.elapsed >= 20 && sample.elapsed <= 160
      && sample.y > 0.05 && sample.y < sample.height * 0.95
      && sample.scrim > 0 && sample.scrim < 0.32);
  if (!entryMid) {
    const entryFrames = [{ elapsed: 0, ...opening.initial }, ...opening.samples];
    const skippedEntryFrame = entryFrames.some((sample, index) => {
      const previous = entryFrames[index - 1];
      if (!previous) return false;
      return previous.y >= previous.height * 0.95
        && sample.y <= sample.height * 0.05
        && previous.scrim <= 0.001
        && sample.scrim >= 0.319
        && sample.elapsed - previous.elapsed >= 120;
    });
    expect(skippedEntryFrame).toBe(true);
  }
  const entryTerminal = opening.samples.at(-1);
  expect(entryTerminal.y).toBeCloseTo(0, 1);
  expect(entryTerminal.scrim).toBeCloseTo(0.32, 2);
  expect(entryTerminal.focusId).toBe('actionSheetClose');

  const dismiss = await host.evaluate(async element => {
    const root = element.shadowRoot;
    const sheet = root?.querySelector('#actionSheet');
    const scrim = root?.querySelector('#actionSheetScrim');
    const home = root?.querySelector('#homeScreen');
    if (!(sheet instanceof HTMLElement) || !(scrim instanceof HTMLElement)
      || !(home instanceof HTMLElement)) throw new Error('Clear sheet is unavailable');
    scrim.click();
    const startedAt = performance.now();
    const samples = [];
    while (!sheet.hidden && performance.now() - startedAt < 700) {
      await new Promise(requestAnimationFrame);
      const matrix = getComputedStyle(sheet).transform === 'none'
        ? new DOMMatrix() : new DOMMatrix(getComputedStyle(sheet).transform);
      samples.push({
        elapsed: performance.now() - startedAt,
        hidden: sheet.hidden,
        y: matrix.m42,
        height: sheet.offsetHeight,
        scrim: Number(getComputedStyle(scrim).opacity),
        homeInert: home.inert,
      });
    }
    return {
      samples,
      hidden: sheet.hidden,
      homeInert: home.inert,
      focusId: root?.activeElement?.id ?? '',
    };
  });
  expect(dismiss.samples.some(sample => !sample.hidden && sample.y > 0.5
    && sample.y < sample.height - 0.5 && sample.homeInert)).toBe(true);
  expect(dismiss.samples.some(sample => sample.scrim > 0 && sample.scrim < 0.32)).toBe(true);
  expect(dismiss.hidden).toBe(true);
  expect(dismiss.homeInert).toBe(false);
  expect(dismiss.focusId).toBe('clearBuffer');

  await host.locator('#clearBuffer').click();
  await page.waitForTimeout(520);
  await host.locator('#actionSheetConfirm').click();
  await expect(host.locator('#actionSheet')).toHaveAttribute('data-mode', 'clear-progress');
  await expect(host.locator('#actionSheet')).toHaveAttribute('aria-busy', 'true');
  await expect(host.locator('#actionSheetTitle')).toHaveText('Clearing one-shot…');
  await page.waitForTimeout(260);
  const beforeCancel = await host.locator('#blobTime').textContent();
  await host.locator('#actionSheetProgressCancel').click();
  await expect(host.locator('#actionSheetProgressCancel')).toBeDisabled();
  await expect(host.locator('#actionSheetProgressCancel')).toHaveText('Cancelling…');
  await expect(host.locator('#actionSheet')).toBeHidden();
  const afterCancel = await host.locator('#blobTime').textContent();
  expect(afterCancel).not.toBe(beforeCancel);
  expect(afterCancel).not.toBe('0:00');
  await expect(host.locator('#clearBuffer')).toBeEnabled();

  await host.locator('#clearBuffer').click();
  await page.waitForTimeout(520);
  await host.locator('#actionSheetConfirm').click();
  await expect(host.locator('#actionSheet')).toHaveAttribute('data-mode', 'clear-progress');
  await expect(host.locator('#actionSheet')).toBeHidden({ timeout: 2500 });
  await expect(host.locator('#blobTime')).toHaveText('0:00');
  await expect(host.locator('#clearBuffer')).toBeDisabled();
  await expect(host.locator('#exportFull')).toBeDisabled();
  await expect(host.locator('#openRange')).toBeDisabled();
});

async function collectPredictiveBack(host, mode) {
  return host.evaluate(async (element, mode) => {
    const root = element.shadowRoot;
    const phone = root?.querySelector('#phone');
    const home = root?.querySelector('#homeScreen');
    const settings = root?.querySelector('#settingsScreen');
    const library = root?.querySelector('#libraryScreen');
    const incidents = root?.querySelector('#incidentsScreen');
    const range = root?.querySelector('#rangeScreen');
    const about = root?.querySelector('#aboutSheet');
    if (!(phone instanceof HTMLElement) || !(home instanceof HTMLElement)
      || !(settings instanceof HTMLElement) || !(library instanceof HTMLElement)
      || !(incidents instanceof HTMLElement) || !(range instanceof HTMLElement)
      || !(about instanceof HTMLElement))
      throw new Error('Reverb predictive-back surfaces are unavailable');

    const surface = mode === 'settings' ? settings
      : mode === 'library' ? library
        : mode === 'incidents' ? incidents
          : mode === 'range' ? range
            : about;
    const target = root?.activeElement instanceof HTMLElement ? root.activeElement : surface;
    const startedAt = performance.now();
    const samples = [];
    target.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      composed: true,
      cancelable: true,
    }));
    while (performance.now() - startedAt < 600) {
      await new Promise(requestAnimationFrame);
      const surfaceStyle = getComputedStyle(surface);
      const surfaceMatrix = surfaceStyle.transform === 'none'
        ? new DOMMatrix()
        : new DOMMatrix(surfaceStyle.transform);
      const homeStyle = getComputedStyle(home);
      const homeMatrix = homeStyle.transform === 'none'
        ? new DOMMatrix()
        : new DOMMatrix(homeStyle.transform);
      const surfaceRect = surface.getBoundingClientRect();
      samples.push({
        elapsed: performance.now() - startedAt,
        active: surface.classList.contains('active'),
        mounted: mode === 'about' ? phone.classList.contains('about-mounted') : true,
        homeActive: home.classList.contains('active'),
        homeMotionVisible: home.classList.contains('motion-visible'),
        homeOffset: homeMatrix.m42 / Math.max(1, home.getBoundingClientRect().height),
        libraryProgress: Number(library.style.getPropertyValue('--library-progress') || 0),
        xFraction: surfaceMatrix.m41 / Math.max(1, surfaceRect.width),
        yFraction: surfaceMatrix.m42 / Math.max(1, surfaceRect.height),
        opacity: Number(surfaceStyle.opacity),
        rangeProgress: Number(range.style.getPropertyValue('--range-transition-progress') || 0),
        rangeMorphProgress: Number(root?.querySelector('#rangeMorphWave')?.style.getPropertyValue('--range-morph-progress') || 0),
        ariaHidden: mode === 'about' ? about.getAttribute('aria-hidden') : null,
        inert: mode === 'about' ? about.inert : false,
        backgroundInert: mode === 'about' ? home.inert : false,
        focusId: root?.activeElement?.id ?? '',
      });
      const terminal = mode === 'about'
        ? !phone.classList.contains('about-mounted')
        : !surface.classList.contains('active');
      if (terminal) break;
    }
    return samples;
  }, mode);
}

test('Reverb system Back continues native 220ms predictive motion for Settings, Library, and Incidents', async ({ page }, info) => {
  const host = await visitReverb(page, info);

  await host.locator('#openSettings').click();
  await page.waitForTimeout(250);
  const settings = await collectPredictiveBack(host, 'settings');
  expect(settings.some(sample => sample.active && sample.homeOffset > 0.08 && sample.homeOffset < 0.92)).toBe(true);
  expect(settings.filter(sample => sample.active).every(sample => !sample.homeActive)).toBe(true);
  expect(settings.at(-1).elapsed).toBeGreaterThanOrEqual(190);
  expect(settings.at(-1).elapsed).toBeLessThan(360);
  expect(settings.at(-1).homeActive).toBe(true);
  expect(settings.at(-1).homeOffset).toBeCloseTo(0, 2);
  expect(settings.at(-1).focusId).toBe('openSettings');

  await host.locator('#openLibrary').click();
  await page.waitForTimeout(250);
  const library = await collectPredictiveBack(host, 'library');
  expect(library.some(sample => sample.active && sample.libraryProgress > 0.08 && sample.libraryProgress < 0.92)).toBe(true);
  expect(library.filter(sample => sample.active).some(sample => sample.homeMotionVisible)).toBe(true);
  expect(library.at(-1).elapsed).toBeGreaterThanOrEqual(190);
  expect(library.at(-1).elapsed).toBeLessThan(360);
  expect(library.at(-1).homeActive).toBe(true);
  expect(library.at(-1).libraryProgress).toBeCloseTo(0, 2);
  expect(library.at(-1).focusId).toBe('openLibrary');

  await host.locator('#openIncidents').click();
  const incidents = await collectPredictiveBack(host, 'incidents');
  const incidentMid = incidents.find(sample => sample.active && sample.xFraction > 0.01 && sample.xFraction < 0.075);
  expect(incidentMid).toBeTruthy();
  expect(incidentMid.opacity).toBeLessThan(1);
  expect(incidentMid.opacity).toBeGreaterThan(0.82);
  expect(incidents.filter(sample => sample.active).some(sample => sample.homeMotionVisible)).toBe(true);
  expect(incidents.at(-1).elapsed).toBeGreaterThanOrEqual(190);
  expect(incidents.at(-1).elapsed).toBeLessThan(360);
  expect(incidents.at(-1).homeActive).toBe(true);
  expect(incidents.at(-1).focusId).toBe('openIncidents');
});

test('Reverb system Back reverses About and Range from their live native geometry before navigation', async ({ page }, info) => {
  const host = await visitReverb(page, info);

  await host.locator('#brandButton').click();
  await page.waitForTimeout(250);
  const about = await collectPredictiveBack(host, 'about');
  const aboutMid = about.find(sample => sample.mounted && sample.yFraction < -0.08 && sample.yFraction > -0.92);
  expect(aboutMid).toBeTruthy();
  expect(aboutMid.opacity).toBeCloseTo(1 + 0.22 * aboutMid.yFraction, 1);
  expect(about.filter(sample => sample.mounted).every(sample => sample.ariaHidden === 'false')).toBe(true);
  expect(about.filter(sample => sample.mounted).every(sample => sample.inert === false)).toBe(true);
  expect(about.filter(sample => sample.mounted).every(sample => sample.backgroundInert === true)).toBe(true);
  expect(about.at(-1).elapsed).toBeGreaterThanOrEqual(190);
  expect(about.at(-1).elapsed).toBeLessThan(360);
  expect(about.at(-1).mounted).toBe(false);
  expect(about.at(-1).focusId).toBe('brandButton');

  await openRangeReady(host);
  const range = await collectPredictiveBack(host, 'range');
  const rangeMid = range.find(sample => sample.active && sample.rangeProgress > 0.08 && sample.rangeProgress < 0.92);
  expect(rangeMid).toBeTruthy();
  expect(rangeMid.rangeMorphProgress).toBeGreaterThanOrEqual(0);
  expect(rangeMid.rangeMorphProgress).toBeLessThan(1);
  expect(range.filter(sample => sample.active).some(sample => sample.homeMotionVisible)).toBe(true);
  expect(range.at(-1).elapsed).toBeGreaterThanOrEqual(190);
  expect(range.at(-1).elapsed).toBeLessThan(360);
  expect(range.at(-1).homeActive).toBe(true);
  expect(range.at(-1).focusId).toBe('openRange');
});

test('Reverb Library system Back collapses the inline player before dismissing Library', async ({ page }, info) => {
  const host = await visitReverb(page, info);
  await host.locator('#openLibrary').click();
  await page.waitForTimeout(250);
  const summary = host.locator('.recording-summary').first();
  await summary.click();
  await page.waitForTimeout(360);

  const result = await host.evaluate(async element => {
    const root = element.shadowRoot;
    const card = root?.querySelector('.recording-card.expanded');
    const expanded = card?.querySelector('.recording-expanded');
    const player = card?.querySelector('.recording-player');
    const summary = card?.querySelector('.recording-summary');
    const library = root?.querySelector('#libraryScreen');
    if (!(card instanceof HTMLElement) || !(expanded instanceof HTMLElement)
      || !(player instanceof HTMLElement) || !(summary instanceof HTMLElement)
      || !(library instanceof HTMLElement))
      throw new Error('Expanded Reverb recording is unavailable');
    const startHeight = expanded.getBoundingClientRect().height;
    summary.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Escape', bubbles: true, composed: true, cancelable: true,
    }));
    const startedAt = performance.now();
    const samples = [];
    while (performance.now() - startedAt < 500) {
      await new Promise(requestAnimationFrame);
      const matrix = getComputedStyle(player).transform === 'none'
        ? new DOMMatrix()
        : new DOMMatrix(getComputedStyle(player).transform);
      samples.push({
        elapsed: performance.now() - startedAt,
        expanded: card.classList.contains('expanded'),
        heightFraction: expanded.getBoundingClientRect().height / Math.max(1, startHeight),
        opacity: Number(getComputedStyle(player).opacity),
        scaleY: matrix.d,
        libraryActive: library.classList.contains('active'),
        focusClass: root?.activeElement?.className ?? '',
      });
      if (!card.classList.contains('expanded')) break;
    }
    return samples;
  });

  const mid = result.find(sample => sample.expanded && sample.heightFraction > 0.08 && sample.heightFraction < 0.92);
  expect(mid).toBeTruthy();
  expect(mid.opacity).toBeCloseTo(mid.heightFraction, 1);
  expect(mid.scaleY).toBeGreaterThanOrEqual(0.96);
  expect(mid.scaleY).toBeLessThan(1);
  expect(result.filter(sample => sample.expanded).every(sample => sample.libraryActive)).toBe(true);
  expect(result.at(-1).elapsed).toBeGreaterThanOrEqual(190);
  expect(result.at(-1).elapsed).toBeLessThan(360);
  expect(result.at(-1).expanded).toBe(false);
  expect(result.at(-1).libraryActive).toBe(true);
  await expect(summary).toBeFocused();

  const libraryExit = await collectPredictiveBack(host, 'library');
  expect(libraryExit.at(-1).homeActive).toBe(true);
});
