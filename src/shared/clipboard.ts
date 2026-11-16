import { captureSelection } from './selection.ts';

export async function writeClipboardText(value: unknown): Promise<boolean> {
  const text = String(value ?? '');
  // Android can expire the user gesture while an asynchronous clipboard request
  // is rejected. Try the synchronous compatibility path while activation is live.
  if (typeof document.execCommand === 'function') {
    const selection = captureSelection();
    const field = document.createElement('textarea');
    field.value = text;
    field.setAttribute('readonly', '');
    field.setAttribute('aria-hidden', 'true');
    field.tabIndex = -1;
    field.style.cssText = 'position:fixed;left:0;top:0;width:1px;height:1px;padding:0;border:0;opacity:0;pointer-events:none;font-size:16px';
    const owner = document.activeElement?.closest('dialog[open], [role="dialog"], :popover-open') ?? document.body;
    owner.append(field);
    try {
      field.focus({ preventScroll: true });
      field.select();
      field.setSelectionRange(0, text.length);
      if (document.execCommand('copy')) return true;
    } catch {
      // A browser without legacy copy can still provide the Clipboard API.
    } finally {
      field.remove();
      selection.restore();
    }
  }
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}
