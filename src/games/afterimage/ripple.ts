/** Decorative feedback never owns input or changes a game's event ordering. */
export function installRipple() {
  const active = new Map<HTMLElement, number>();
  const clear = () => { active.forEach((timer, element) => { clearTimeout(timer); element.remove(); }); active.clear(); };
  const press = (event: PointerEvent) => {
    if (document.hidden || event.button !== 0 || matchMedia('(prefers-reduced-motion: reduce)').matches || !(event.target instanceof Element)) return;
    const target = event.target.closest<HTMLElement>('.afterimage-app button:not(:disabled)');
    if (!target || target.getAttribute('aria-disabled') === 'true') return;
    const rect = target.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    if (active.size >= 4) { const oldest = active.keys().next().value as HTMLElement | undefined; if (oldest) { clearTimeout(active.get(oldest)); oldest.remove(); active.delete(oldest); } }
    const clip = document.createElement('span'), wave = document.createElement('span');
    clip.className = 'ai-ripple-clip'; clip.setAttribute('aria-hidden', 'true');
    Object.assign(clip.style, { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px`, borderRadius: getComputedStyle(target).borderRadius });
    const diameter = Math.hypot(rect.width, rect.height) * 2;
    wave.className = 'ai-ripple-wave';
    Object.assign(wave.style, { width: `${diameter}px`, height: `${diameter}px`, left: `${Math.max(0, Math.min(rect.width, event.clientX - rect.left)) - diameter / 2}px`, top: `${Math.max(0, Math.min(rect.height, event.clientY - rect.top)) - diameter / 2}px` });
    clip.append(wave); document.body.append(clip);
    active.set(clip, window.setTimeout(() => { clip.remove(); active.delete(clip); }, 430));
  };
  document.addEventListener('pointerdown', press, { passive: true });
  document.addEventListener('visibilitychange', clear);
  window.addEventListener('scroll', clear, { passive: true, capture: true });
  window.addEventListener('blur', clear);
  return () => { clear(); document.removeEventListener('pointerdown', press); document.removeEventListener('visibilitychange', clear); window.removeEventListener('scroll', clear, true); window.removeEventListener('blur', clear); };
}
