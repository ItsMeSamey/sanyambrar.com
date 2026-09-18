export function errorMessage(value: unknown, fallback = 'Unknown error'): string {
  if (value instanceof Error) return value.message || value.name || fallback;
  if (typeof value === 'string' && value) return value;
  if (value == null) return fallback;
  try {
    const text = String(value);
    return text || fallback;
  } catch {
    return fallback;
  }
}

export function formatThrownError(value: unknown): string {
  const seen = new Set<unknown>();

  const format = (error: unknown): string => {
    if (error && (typeof error === 'object' || typeof error === 'function')) {
      if (seen.has(error)) return '[circular error cause]';
      seen.add(error);
    }

    if (error instanceof Error) {
      let text = error.stack || `${error.name}: ${error.message}`;
      if (typeof AggregateError !== 'undefined' && error instanceof AggregateError && error.errors.length) {
        text += error.errors
          .map((nested, index) => `\n\nAggregate error ${index + 1}:\n${format(nested)}`)
          .join('');
      }
      if ('cause' in error && error.cause !== undefined) {
        text += `\n\nCaused by:\n${format(error.cause)}`;
      }
      return text;
    }

    if (typeof error === 'string') return error;
    try {
      return JSON.stringify(error, null, 2) || String(error);
    } catch {
      try { return String(error); } catch { return '[unprintable thrown value]'; }
    }
  };

  return format(value);
}

export function errorWithCause(message: string, cause: unknown): Error {
  try {
    return new Error(message, { cause });
  } catch {
    const error = new Error(message);
    Object.defineProperty(error, 'cause', { value: cause, configurable: true });
    return error;
  }
}

export function renderFatalError(root: HTMLElement, title: string, error: unknown): void {
  const shell = document.createElement('main');
  shell.className = 'samey-entry-fatal';
  shell.setAttribute('role', 'alert');

  const heading = document.createElement('strong');
  heading.textContent = title;

  const stack = document.createElement('pre');
  stack.className = 'samey-error-stack';
  stack.textContent = formatThrownError(error);

  const reload = document.createElement('button');
  reload.type = 'button';
  reload.textContent = 'Reload page';
  reload.addEventListener('click', () => location.reload());

  shell.append(heading, stack, reload);
  root.replaceChildren(shell);
}
