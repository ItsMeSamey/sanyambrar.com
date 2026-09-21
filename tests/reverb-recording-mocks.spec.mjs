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

async function visitReverb(page, info) {
  const metadata = info.project.metadata;
  const port = metadata.development ? metadata.sitePort : metadata.port;
  await page.goto(`http://127.0.0.1:${port}/projects/reverb/`, { waitUntil: 'networkidle' });
  return page.getByRole('group', { name: 'Interactive Reverb UI demo' });
}

test('Reverb recordings remain synthetic mocks and never request microphone capture', async ({ page }, info) => {
  await page.addInitScript(() => {
    const probe = { getUserMediaCalls: 0, mediaRecorderConstructs: 0 };
    Object.defineProperty(globalThis, '__reverbCaptureProbe', {
      value: probe,
      configurable: true,
    });

    const mediaDevices = navigator.mediaDevices;
    if (mediaDevices && typeof mediaDevices.getUserMedia === 'function') {
      const blockedGetUserMedia = () => {
        probe.getUserMediaCalls += 1;
        return Promise.reject(new Error('Reverb web demo must not request microphone capture'));
      };
      try {
        Object.defineProperty(mediaDevices, 'getUserMedia', {
          value: blockedGetUserMedia,
          configurable: true,
        });
      } catch {
        try { mediaDevices.getUserMedia = blockedGetUserMedia; } catch {}
      }
    }

    if (typeof globalThis.MediaRecorder === 'function') {
      const NativeMediaRecorder = globalThis.MediaRecorder;
      try {
        globalThis.MediaRecorder = new Proxy(NativeMediaRecorder, {
          construct(target, args, newTarget) {
            probe.mediaRecorderConstructs += 1;
            return Reflect.construct(target, args, newTarget);
          },
        });
      } catch {}
    }
  });

  const host = await visitReverb(page, info);
  await expect(host).toBeVisible();

  // Exercise both the capture-looking home control and the Library player. They are visual
  // simulations only: no microphone stream, recorder, media element, blob URL, or real audio.
  await host.locator('#blobControl').click();
  await host.locator('#blobControl').click();
  await host.locator('#openLibrary').click();
  const firstRecording = host.locator('.recording-card').first();
  await firstRecording.locator('.recording-summary').click();
  await expect(firstRecording).toHaveClass(/expanded/);
  await firstRecording.locator('.recording-play').click();
  await page.waitForTimeout(120);

  const state = await host.evaluate(element => {
    const root = element.shadowRoot;
    const probe = globalThis.__reverbCaptureProbe;
    return {
      getUserMediaCalls: probe?.getUserMediaCalls ?? -1,
      mediaRecorderConstructs: probe?.mediaRecorderConstructs ?? -1,
      mediaElements: root?.querySelectorAll('audio,video').length ?? -1,
      mediaSources: root?.querySelectorAll('[src^="blob:"],[srcobject]').length ?? -1,
      recordings: root?.querySelectorAll('.recording-card[data-recording]').length ?? 0,
    };
  });

  expect(state).toEqual({
    getUserMediaCalls: 0,
    mediaRecorderConstructs: 0,
    mediaElements: 0,
    mediaSources: 0,
    recordings: 7,
  });
});
