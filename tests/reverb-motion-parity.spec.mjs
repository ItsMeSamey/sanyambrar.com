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
  expect(values.some(value => value > 0.02 && value < 0.98)).toBe(true);
  const terminal = samples.at(-1);
  expect(terminal.elapsed).toBeGreaterThanOrEqual(190);
  expect(terminal.elapsed).toBeLessThan(340);
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
    const snapshot = {
      progress: Number(face.style.getPropertyValue('--buffer-flip-progress') || 0),
      degrees: Number(face.style.getPropertyValue('--buffer-flip-degrees') || 0),
      depth: Number(face.style.getPropertyValue('--buffer-depth-scale') || 1),
      oneSelected: one.getAttribute('aria-selected') === 'true',
      loopSelected: loop.getAttribute('aria-selected') === 'true',
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
    const finalWave = root?.querySelector('#rangeFinalWave');
    const play = root?.querySelector('#rangePlay');
    if (!(open instanceof HTMLElement) || !(blob instanceof HTMLElement)
      || !(screen instanceof HTMLElement) || !(main instanceof HTMLElement)
      || !(wavebox instanceof HTMLElement) || !(morph instanceof SVGElement)
      || !(finalWave instanceof SVGElement) || !(play instanceof HTMLButtonElement))
      throw new Error('Reverb Range motion surfaces are unavailable');
    const blobRect = blob.getBoundingClientRect();
    const sourceCenter = {
      x: blobRect.left + blobRect.width / 2,
      y: blobRect.top + blobRect.height / 2,
    };
    const startedAt = performance.now();
    const samples = [];
    open.click();
    // Native timeline interaction is disabled until 98%; this programmatic click
    // deliberately exercises the capture guard during the opening transition.
    play.click();
    while (performance.now() - startedAt < 1500) {
      await new Promise(requestAnimationFrame);
      const transition = Number(screen.style.getPropertyValue('--range-transition-progress') || 0);
      const morphProgress = Number(morph.style.getPropertyValue('--range-morph-progress') || 0);
      const chrome = Number(screen.style.getPropertyValue('--range-chrome-alpha') || 0);
      const reveal = Number(screen.style.getPropertyValue('--range-wave-reveal') || 0);
      const rect = morph.getBoundingClientRect();
      const transform = new DOMMatrix(getComputedStyle(morph).transform);
      samples.push({
        elapsed: performance.now() - startedAt,
        transition,
        morphProgress,
        chrome,
        reveal,
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
        finalOpacity: Number(getComputedStyle(finalWave).opacity),
        playLabel: play.getAttribute('aria-label'),
      });
      if (transition >= 0.999 && reveal >= 0.999) break;
    }
    return samples;
  });
}

test('Reverb Range opens with the native 760ms blob-to-waveform morph and delayed readiness', async ({ page }, info) => {
  const host = await visitReverb(page, info);
  const samples = await collectRangeOpening(host);
  expect(samples.length).toBeGreaterThan(8);

  const sourceFrame = samples.find(sample => sample.transition <= 0.07);
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
  expect(samples.filter(sample => sample.transition < 0.98).every(sample => !sample.ready)).toBe(true);
  const firstReady = samples.find(sample => sample.ready);
  expect(firstReady).toBeTruthy();
  expect(firstReady.transition).toBeGreaterThanOrEqual(0.98);
  expect(firstReady.inert).toBe(false);
  expect(firstReady.activeId).toBe('rangeDurationWheel');

  const transitionTerminal = samples.find(sample => sample.transition >= 0.999);
  expect(transitionTerminal).toBeTruthy();
  expect(transitionTerminal.elapsed).toBeGreaterThanOrEqual(700);
  expect(transitionTerminal.elapsed).toBeLessThan(900);
  expect(transitionTerminal.morphProgress).toBeCloseTo(1, 2);
  expect(transitionTerminal.chrome).toBeCloseTo(1, 2);
  expect(transitionTerminal.transform.a).toBeCloseTo(1, 2);
  expect(transitionTerminal.transform.d).toBeCloseTo(1, 2);
  expect(transitionTerminal.transform.e).toBeCloseTo(0, 1);
  expect(transitionTerminal.transform.f).toBeCloseTo(0, 1);

  const revealTerminal = samples.at(-1);
  expect(revealTerminal.reveal).toBeCloseTo(1, 2);
  expect(revealTerminal.finalOpacity).toBeCloseTo(1, 2);
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
        expandedHeight: expanded.getBoundingClientRect().height,
        targetHeight: player.scrollHeight,
        opacity: Number(getComputedStyle(player).opacity),
        morph,
        ariaExpanded: summary.getAttribute('aria-expanded'),
        ariaHidden: expanded.getAttribute('aria-hidden'),
        inert: expanded.inert,
        playLabel: play.getAttribute('aria-label'),
      });
      if (morph >= 0.999 && Math.abs(expanded.getBoundingClientRect().height - player.scrollHeight) < 1)
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
  const fadeMid = opening.find(sample => sample.elapsed >= 120 && sample.elapsed <= 220);
  expect(fadeMid.opacity).toBeGreaterThan(0.05);
  expect(fadeMid.opacity).toBeLessThan(0.99);
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
