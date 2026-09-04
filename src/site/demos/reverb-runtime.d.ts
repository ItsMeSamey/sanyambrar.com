export function runReverbDemoRuntime(
  document: unknown,
  requestAnimationFrame: (callback: FrameRequestCallback) => number,
  setTimeout: (handler: (...args: unknown[]) => void, timeout?: number, ...args: unknown[]) => number,
  clearTimeout: (id?: number) => void,
  devicePixelRatio: number,
): { refreshTheme?(): void };
