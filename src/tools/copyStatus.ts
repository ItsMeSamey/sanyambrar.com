import { writeClipboardText } from '../shared/clipboard.ts';

type CopyStatusElement = Pick<HTMLElement, 'textContent'> & { classList: Pick<DOMTokenList, 'toggle'> };

export function createToolCopyStatus(
  status: CopyStatusElement,
  isActive: () => boolean,
  write: (text: string) => Promise<boolean> = writeClipboardText,
) {
  let revision = 0;
  const show = (message: string, failed = false) => {
    status.textContent = message;
    status.classList.toggle('danger', failed);
  };
  return {
    reset() { revision++; show(''); },
    async copy(text: string) {
      const request = ++revision;
      show('Copying...');
      let copied = false;
      try { copied = await write(text); } catch { /* Report denied or unavailable clipboard access below. */ }
      if (request !== revision || !isActive()) return;
      show(copied ? 'Copied.' : 'Could not copy. Select the output and copy it manually.', !copied);
    },
  };
}
