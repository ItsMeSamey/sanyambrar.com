const userAgentPlatform = (() => {
  const data: unknown = Reflect.get(navigator, 'userAgentData');
  if (!data || typeof data !== 'object') return '';
  const platform: unknown = Reflect.get(data, 'platform');
  return typeof platform === 'string' ? platform : '';
})();

const applePlatform = /Mac|iPhone|iPad|iPod/i.test(userAgentPlatform || navigator.userAgent);

export const shortcutKey = (key: string) => applePlatform ? `⌘${key}` : `Ctrl+${key}`;
export const searchShortcutLabel = applePlatform ? '⌘ K' : 'Ctrl K';
