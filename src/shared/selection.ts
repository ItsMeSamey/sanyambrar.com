// Keep text selections intact while a temporary menu or clipboard field takes focus.
export function captureSelection(focus = document.activeElement, includeFieldSelection = true) {
  const field = includeFieldSelection && (focus instanceof HTMLInputElement || focus instanceof HTMLTextAreaElement) ? focus : null;
  const start = field?.selectionStart ?? null;
  const end = field?.selectionEnd ?? null;
  const direction = field?.selectionDirection ?? 'none';
  const value = field?.value;
  const selection = document.getSelection();
  const ranges = selection ? Array.from({ length: selection.rangeCount }, (_, index) => selection.getRangeAt(index).cloneRange()) : [];
  const anchor = selection?.anchorNode;
  const anchorOffset = selection?.anchorOffset ?? 0;
  const focusNode = selection?.focusNode;
  const focusOffset = selection?.focusOffset ?? 0;
  const text = field && start !== null && end !== null ? field.value.slice(start, end) : selection?.toString() ?? '';
  const connected = () => (!focus || focus.isConnected) && ranges.every(range => range.commonAncestorContainer.isConnected);
  return {
    text,
    matches() {
      if (!connected()) return false;
      if (field) return field.value === value && field.selectionStart === start && field.selectionEnd === end;
      const current = document.getSelection();
      return !!current && current.anchorNode === anchor && current.anchorOffset === anchorOffset
        && current.focusNode === focusNode && current.focusOffset === focusOffset && current.toString() === text;
    },
    restore() {
      if (!connected()) return;
      if (focus instanceof HTMLElement) focus.focus({ preventScroll: true });
      if (field && start !== null && end !== null) {
        if (field.value === value) field.setSelectionRange(start, end, direction);
        // Document Selection operations can collapse a focused control's range
        // in Chromium; its own selection API must be the final authority.
        return;
      }
      const current = document.getSelection();
      if (!current) return;
      current.removeAllRanges();
      for (const range of ranges) current.addRange(range);
      if (ranges.length === 1 && anchor && focusNode) current.setBaseAndExtent(anchor, anchorOffset, focusNode, focusOffset);
    },
  };
}
