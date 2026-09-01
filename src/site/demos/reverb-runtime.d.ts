export function runReverbDemoRuntime(
  document: unknown,
  requestAnimationFrame: (callback: FrameRequestCallback) => number,
  setTimeout: (handler: (...args: any[]) => void, timeout?: number, ...args: any[]) => number,
  clearTimeout: (id?: number) => void,
  devicePixelRatio: number,
): { refreshTheme?(): void };
