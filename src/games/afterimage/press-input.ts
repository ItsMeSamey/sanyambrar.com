type PointerPress = Pick<PointerEvent, 'button' | 'pointerId' | 'pointerType'> & {
  sourceCapabilities?: { firesTouchEvents?: boolean } | null;
};
type Click = Pick<MouseEvent, 'detail'> & { pointerType?: string; sourceCapabilities?: { firesTouchEvents?: boolean } | null };

/** Native pointer clicks must not replay the action already taken on pointerdown. */
export function isVirtualClick(event: Click) {
  return event.detail === 0 && !event.pointerType && !event.sourceCapabilities?.firesTouchEvents;
}

/** Each finger owns its press independently, including non-primary touch pointers. */
export function createPointerPresses() {
  const held = new Set<number>();
  return {
    down(event: PointerPress) {
      if (event.button !== 0 || held.has(event.pointerId) || event.pointerType === 'mouse' && event.sourceCapabilities?.firesTouchEvents) return false;
      held.add(event.pointerId);
      return true;
    },
    release(pointerId: number) { held.delete(pointerId); },
    reset() { held.clear(); },
  };
}
