import config from '../static/shared/appearance.json';

Object.defineProperty(globalThis, 'SameyAppearanceConfig', {
  value: Object.freeze(config),
  configurable: false,
  writable: false,
});
