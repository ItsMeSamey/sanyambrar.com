type Click = Pick<MouseEvent, 'detail'> & { pointerType?: string; sourceCapabilities?: { firesTouchEvents?: boolean } | null };

export function isKeyboardActivation(event: Click): boolean {
  return event.detail === 0 && !event.pointerType && !event.sourceCapabilities?.firesTouchEvents;
}
