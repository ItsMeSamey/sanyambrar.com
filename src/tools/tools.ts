// @ts-nocheck
import { TOOLS } from '../shared/catalog.ts';
import { renderMarkdown } from './markdown.ts';
let sharedMonacoPromise;

function loadMonacoModule() {
  if (sharedMonacoPromise) return sharedMonacoPromise;
  const releaseLoading = globalThis.SameyLoadingBeginAfterDelay?.() ?? (() => {});
  sharedMonacoPromise = import('../site/monaco.ts').catch(error => {
    sharedMonacoPromise = undefined;
    throw error;
  }).finally(releaseLoading);
  return sharedMonacoPromise;
}
export function mountTool(toolId, root, context) {
  'use strict';

  if (!root || !context) return () => {};

  const route = () => toolId;
  const stateKey = (tool, name) => `tool.${tool}.${name}`;
  const localGet = (tool, name, fallback = '') => {
    try { return localStorage.getItem(stateKey(tool, name)) ?? fallback; } catch { return fallback; }
  };
  const localSet = (tool, name, value) => {
    try { localStorage.setItem(stateKey(tool, name), String(value)); } catch {}
  };
  const get = (name, fallback = '') => localGet(route(), name, fallback);
  const set = (name, value) => localSet(route(), name, value);
  const esc = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const icon = name => ({
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>',
    swap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m16 3 4 4-4 4"/><path d="M20 7H4"/><path d="m8 21-4-4 4-4"/><path d="M4 17h16"/></svg>',
    link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
  })[name] || '';
  const copy = async value => {
    try {
      if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(String(value)); return true; }
      const field = document.createElement('textarea');
      field.value = String(value); field.setAttribute('readonly', '');
      field.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
      document.body.append(field);
      try { field.select(); return document.execCommand('copy'); }
      finally { field.remove(); }
    } catch { return false; }
  };

  let disposeTool = () => {};
  let disposed = false;
  let renderGeneration = 0;
  let ensureLanguage = async () => {};
  let monacoThemeListener = null;

  const setContext = html => { context.innerHTML = html || ''; };

  const siteFont = () => getComputedStyle(document.documentElement).getPropertyValue('--site-font').trim() || 'system-ui';
  function siteMonacoTheme(monaco) {
    const style = getComputedStyle(document.documentElement);
    const fontFamily = siteFont();
    const bg = style.getPropertyValue('--site-bg').trim() || '#0d1117';
    const fg = style.getPropertyValue('--site-fg').trim() || '#e6edf3';
    const muted = style.getPropertyValue('--site-muted').trim() || '#8b949e';
    const line = style.getPropertyValue('--site-line').trim() || '#30363d';
    const soft = style.getPropertyValue('--site-soft').trim() || '#161b22';
    const accent = style.getPropertyValue('--site-accent').trim() || '#58a6ff';
    const error = style.getPropertyValue('--site-error').trim() || '#f85149';
    const fast = style.getPropertyValue('--site-fast-color').trim() || accent;
    const effort = style.getPropertyValue('--site-effort-color').trim() || accent;
    const dark = document.documentElement.classList.contains('dark') || document.documentElement.dataset.kbTheme === 'dark';
    monaco.editor.defineTheme('samey-site', {
      base: dark ? 'vs-dark' : 'vs',
      inherit: true,
      rules: [
        { token: 'comment', foreground: muted.replace('#', '') },
        { token: 'string', foreground: dark ? '72b172' : '267f37' },
        { token: 'number', foreground: dark ? 'b281d3' : '795e26' },
        { token: 'keyword', foreground: accent.replace('#', '') },
      ],
      colors: {
        'editor.background': bg,
        'editor.foreground': fg,
        'editorGutter.background': bg,
        'editorLineNumber.foreground': muted,
        'editorLineNumber.activeForeground': fg,
        'editor.lineHighlightBackground': soft,
        'editor.lineHighlightBorder': '#00000000',
        'editor.selectionBackground': `${accent}55`,
        'editor.inactiveSelectionBackground': `${accent}2c`,
        'editorCursor.foreground': accent,
        'editorIndentGuide.background1': line,
        'editorIndentGuide.activeBackground1': muted,
        'editorWhitespace.foreground': line,
        'editorError.foreground': error,
        'diffEditor.insertedTextBackground': `${fast}66`,
        'diffEditor.removedTextBackground': `${error}66`,
        'diffEditor.insertedLineBackground': `${fast}2b`,
        'diffEditor.removedLineBackground': `${error}2b`,
        'diffEditorGutter.insertedLineBackground': `${fast}55`,
        'diffEditorGutter.removedLineBackground': `${error}55`,
        'diffEditorOverview.insertedForeground': fast,
        'diffEditorOverview.removedForeground': error,
        'diffEditor.diagonalFill': line,
        'scrollbar.shadow': '#00000000',
        'scrollbarSlider.background': `${muted}55`,
        'scrollbarSlider.hoverBackground': `${muted}88`,
        'scrollbarSlider.activeBackground': `${muted}aa`,
      },
    });
    monaco.editor.setTheme('samey-site');
    for (const editor of monaco.editor.getEditors()) editor.updateOptions({ fontFamily });
  }

  function ensureMonaco() {
    return loadMonacoModule().then(module => {
      const { monaco } = module;
      ensureLanguage = module.ensureMonacoLanguage;
      siteMonacoTheme(monaco);
      if (!disposed && !monacoThemeListener) {
        monacoThemeListener = () => siteMonacoTheme(monaco);
        addEventListener('samey-themechange', monacoThemeListener);
      }
      return monaco;
    });
  }

  const editorOptions = (language, extra = {}) => ({
    language,
    theme: 'samey-site',
    automaticLayout: true,
    minimap: { enabled: false },
    lineNumbers: 'on',
    lineNumbersMinChars: 3,
    glyphMargin: false,
    folding: true,
    fontFamily: siteFont(),
    fontSize: 14,
    lineHeight: 22,
    fontLigatures: true,
    wordWrap: 'on',
    wrappingIndent: 'same',
    renderLineHighlight: 'gutter',
    renderWhitespace: 'selection',
    scrollBeyondLastLine: false,
    smoothScrolling: false,
    overviewRulerLanes: 0,
    hideCursorInOverviewRuler: true,
    fixedOverflowWidgets: true,
    padding: { top: 18, bottom: 26 },
    scrollbar: { useShadows: false, verticalScrollbarSize: 8, horizontalScrollbarSize: 8, alwaysConsumeMouseWheel: false },
    ...extra,
  });

  function loadingEditor(label = 'Loading editor…') {
    root.innerHTML = `<div class="tool-editor-loading"><span>${esc(label)}</span></div>`;
    setContext('');
  }

  const currentRender = generation => generation === renderGeneration;

  const te = new TextEncoder();
  function textStats(text) {
    let chars = 0, nonAscii = 0;
    for (const char of text) {
      chars++;
      if (char.codePointAt(0) > 127) nonAscii++;
    }
    return {
      words: text.match(/[A-Za-z0-9_]+|[\p{L}\p{N}]+/gu)?.length ?? 0,
      chars,
      bytes: te.encode(text).length,
      nonAscii,
    };
  }

  async function textTool(generation) {
    loadingEditor();
    const monaco = await ensureMonaco();
    if (!currentRender(generation) || route() !== 'text') return;
    const value = get('text', 'Hello World! Café résumé naïve\n你好世界！\nEmoji: 🎉🚀💡');
    root.innerHTML = '<section class="tool-one-pane"><div id="text-editor" class="monaco-host"></div></section>';
    const model = monaco.editor.createModel(value, 'plaintext');
    const editor = monaco.editor.create(root.querySelector('#text-editor'), editorOptions('plaintext'));
    editor.setModel(model);
    let decorationIds = [];
    const paint = () => {
      const text = model.getValue();
      const stats = textStats(text);
      setContext(`<span class="text-tool-stats"><span class="text-stat"><b>W</b><strong>${stats.words.toLocaleString()}</strong><span>words</span></span><span class="text-stat"><b>X</b><strong>${stats.chars.toLocaleString()}</strong><span>chars</span></span><span class="text-stat"><b>A</b><strong>${stats.nonAscii.toLocaleString()}</strong><span>non-ASCII</span></span></span>`);
      const decorations = [];
      for (let lineNumber = 1; lineNumber <= model.getLineCount(); lineNumber++) {
        const line = model.getLineContent(lineNumber);
        for (const match of line.matchAll(/[A-Za-z0-9_]+|[\p{L}\p{N}]+/gu)) {
          decorations.push({ range: new monaco.Range(lineNumber, match.index + 1, lineNumber, match.index + match[0].length + 1), options: { inlineClassName: 'monaco-word-highlight' } });
        }
        for (let index = 0; index < line.length;) {
          const cp = line.codePointAt(index);
          const len = cp > 0xffff ? 2 : 1;
          if (cp > 127) decorations.push({ range: new monaco.Range(lineNumber, index + 1, lineNumber, index + len + 1), options: { inlineClassName: 'monaco-nonascii-highlight' } });
          index += len;
        }
      }
      decorationIds = editor.deltaDecorations(decorationIds, decorations);
      set('text', text);
    };
    const sub = model.onDidChangeContent(paint);
    paint();
    disposeTool = () => { sub.dispose(); editor.dispose(); model.dispose(); };
  }

  const td = new TextDecoder('utf-8', { fatal: true });
  const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  const B88 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!#$%&()*+,-./:;=?@[]^_{|}~';
  const b2s = bytes => { let out = ''; for (let offset = 0; offset < bytes.length; offset += 0x8000) out += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000)); return out; };
  const s2b = text => Uint8Array.from(text, char => char.charCodeAt(0));
  const bxE = (bytes, alphabet) => {
    if (!bytes.length) return '';
    let n = 0n;
    for (const byte of bytes) n = n * 256n + BigInt(byte);
    let out = '';
    for (; n; n /= BigInt(alphabet.length)) out = alphabet[Number(n % BigInt(alphabet.length))] + out;
    let zeroes = 0;
    while (zeroes < bytes.length && !bytes[zeroes]) zeroes++;
    return alphabet[0].repeat(zeroes) + out;
  };
  const bxD = (text, alphabet) => {
    text = text.trim();
    let n = 0n;
    for (const char of text) {
      const value = alphabet.indexOf(char);
      if (value < 0) throw Error(`Invalid character: ${char}`);
      n = n * BigInt(alphabet.length) + BigInt(value);
    }
    const out = [];
    for (; n; n >>= 8n) out.unshift(Number(n & 255n));
    let zeroes = 0;
    while (zeroes < text.length && text[zeroes] === alphabet[0]) zeroes++;
    return Uint8Array.from([...Array(zeroes).fill(0), ...out]);
  };
  const hE = bytes => [...bytes].map(value => value.toString(16).padStart(2, '0')).join('');
  const hD = text => {
    text = text.replace(/\s|^0x/gi, '');
    if (text.length % 2 || !/^\s*$|^[\da-f]+$/i.test(text)) throw Error('Invalid hex');
    return Uint8Array.from(text.match(/../g)?.map(value => parseInt(value, 16)) ?? []);
  };
  const binE = bytes => [...bytes].map(value => value.toString(2).padStart(8, '0')).join(' ');
  const binD = text => {
    text = text.replace(/[\s_]/g, '');
    if (text.length % 8 || !/^[01]*$/.test(text)) throw Error('Invalid binary');
    return Uint8Array.from(text.match(/.{8}/g)?.map(value => parseInt(value, 2)) ?? []);
  };
  const b32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const b32E = bytes => {
    let out = '', buffer = 0, bits = 0;
    for (const byte of bytes) {
      buffer = buffer << 8 | byte;
      bits += 8;
      while (bits >= 5) { out += b32[buffer >>> (bits - 5) & 31]; bits -= 5; }
    }
    if (bits) out += b32[buffer << (5 - bits) & 31];
    while (out.length % 8) out += '=';
    return out;
  };
  const b32D = text => {
    text = text.toUpperCase().replace(/[\s-=]/g, '');
    let buffer = 0, bits = 0;
    const out = [];
    for (const char of text) {
      const value = b32.indexOf(char);
      if (value < 0) throw Error('Invalid Base32');
      buffer = buffer << 5 | value;
      bits += 5;
      if (bits >= 8) { out.push(buffer >>> (bits - 8) & 255); bits -= 8; }
    }
    return Uint8Array.from(out);
  };
  const htmlE = text => [...text].map(char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? (char.codePointAt(0) > 127 ? `&#${char.codePointAt(0)};` : char)).join('');
  const htmlD = text => { const area = document.createElement('textarea'); area.innerHTML = text; return area.value; };
  const uniE = text => [...text].map(char => {
    const value = char.codePointAt(0);
    return value >= 32 && value <= 126 && char !== '\\' ? char : value <= 0xffff ? `\\u${value.toString(16).padStart(4, '0')}` : `\\u{${value.toString(16)}}`;
  }).join('');
  const uniD = text => text.replace(/\\u\{([\da-f]{1,6})\}|\\u([\da-f]{4})|\\x([\da-f]{2})/gi, (_, a, b, c) => String.fromCodePoint(parseInt(a || b || c, 16)));
  const rot = text => text.replace(/[A-Za-z]/g, char => String.fromCharCode((char <= 'Z' ? 65 : 97) + (char.charCodeAt(0) - (char <= 'Z' ? 65 : 97) + 13) % 26));
  const FORMATS = [['base64', 'Base64'], ['base64url', 'Base64URL'], ['base32', 'Base32'], ['base58', 'Base58'], ['base88', 'Base88'], ['hex', 'Hex'], ['binary', 'Binary'], ['url', 'URL'], ['html', 'HTML'], ['json', 'JSON string'], ['unicode', 'Unicode'], ['rot13', 'ROT13']];
  const convert = (format, text, decode = false) => {
    if (format === 'base64') return decode ? td.decode(s2b(atob(text.replace(/\s/g, '')))) : btoa(b2s(te.encode(text)));
    if (format === 'base64url') {
      if (decode) { let value = text.replace(/\s/g, '').replace(/-/g, '+').replace(/_/g, '/'); value += '='.repeat((4 - value.length % 4) % 4); return td.decode(s2b(atob(value))); }
      return btoa(b2s(te.encode(text))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }
    if (format === 'base32') return decode ? td.decode(b32D(text)) : b32E(te.encode(text));
    if (format === 'base58') return decode ? td.decode(bxD(text, B58)) : bxE(te.encode(text), B58);
    if (format === 'base88') return decode ? td.decode(bxD(text, B88)) : bxE(te.encode(text), B88);
    if (format === 'hex') return decode ? td.decode(hD(text)) : hE(te.encode(text));
    if (format === 'binary') return decode ? td.decode(binD(text)) : binE(te.encode(text));
    if (format === 'url') return decode ? decodeURIComponent(text) : encodeURIComponent(text);
    if (format === 'html') return decode ? htmlD(text) : htmlE(text);
    if (format === 'json') {
      if (decode) { const value = JSON.parse(text); if (typeof value !== 'string') throw Error('JSON value is not a string'); return value; }
      return JSON.stringify(text);
    }
    if (format === 'unicode') return decode ? uniD(text) : uniE(text);
    return rot(text);
  };

  const strictDecode = (format, text) => {
    const raw = text.trim();
    if (!raw) return '';
    if (format === 'hex') {
      const value = raw.replace(/^0x/i, '').replace(/\s/g, '');
      if (!value || value.length % 2 || !/^[\da-f]+$/i.test(value)) throw Error('Invalid Hex');
    } else if (format === 'base32') {
      const value = raw.replace(/\s/g, '');
      if (!/^[A-Z2-7]+={0,6}$/i.test(value) || /=[^=]/.test(value)) throw Error('Invalid Base32');
      const body = value.replace(/=+$/, '');
      if (![0, 2, 4, 5, 7].includes(body.length % 8)) throw Error('Invalid Base32');
      const decoded = b32D(value);
      if (b32E(decoded).replace(/=+$/, '') !== body.toUpperCase()) throw Error('Invalid Base32');
    } else if (format === 'base64') {
      const value = raw.replace(/\s/g, '');
      if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) throw Error('Invalid Base64');
    } else if (format === 'base64url') {
      const value = raw.replace(/\s/g, '');
      if (!/^[A-Za-z0-9_-]+={0,2}$/.test(value)) throw Error('Invalid Base64URL');
    } else if (format === 'binary') {
      const value = raw.replace(/[\s_]/g, '');
      if (!value || value.length % 8 || !/^[01]+$/.test(value)) throw Error('Invalid Binary');
    }
    return convert(format, raw, true);
  };
  const detectFormat = text => {
    const raw = text.trim();
    if (!raw) return null;
    const candidates = ['hex', 'base32', 'base64', 'base64url', 'url'];
    for (const format of candidates) {
      try {
        if (format === 'url') {
          if (!/%[\da-f]{2}/i.test(raw)) continue;
          const decoded = decodeURIComponent(raw);
          if (decoded === raw) continue;
          return format;
        }
        strictDecode(format, raw);
        return format;
      } catch {}
    }
    return null;
  };

  async function baseTool(generation) {
    loadingEditor();
    const monaco = await ensureMonaco();
    if (!currentRender(generation) || route() !== 'base') return;
    let mode = get('mode', 'decode') === 'encode' ? 'encode' : 'decode';
    let selection = get('format', 'auto');
    if (![...FORMATS.map(([value]) => value), 'auto'].includes(selection)) selection = 'auto';
    let separateLines = get('lines', '0') === '1';
    const initial = get('text', 'https%3A%2F%2Fsanyambrar.com%2Ftools%3Ftool%3Dbase');
    root.innerHTML = `<section class="codec-flow"><div class="codec-shell"><section class="codec-pane codec-input-pane"><header><span>Input</span></header><div id="codec-input" class="codec-editor monaco-host"></div></section><div class="codec-controls" aria-label="Conversion options"><label><span>Mode</span><select data-codec-mode><option value="decode"${mode === 'decode' ? ' selected' : ''}>Decode</option><option value="encode"${mode === 'encode' ? ' selected' : ''}>Encode</option></select></label><label><span>Format</span><select data-codec-format><option value="auto"${selection === 'auto' ? ' selected' : ''}>Auto detect</option>${FORMATS.map(([value, label]) => `<option value="${value}"${selection === value ? ' selected' : ''}>${label}</option>`).join('')}</select></label><button class="codec-line-toggle" type="button" data-codec-lines role="switch" aria-checked="${separateLines}"><span class="codec-switch-track" aria-hidden="true"><span></span></span><span>Per line</span></button><span class="codec-auto" data-codec-auto></span></div><section class="codec-pane codec-output-pane"><header><span>Output</span><button type="button" data-codec-copy aria-label="Copy output" title="Copy output">${icon('copy')}</button></header><div id="codec-output" class="codec-editor monaco-host"></div></section><div class="codec-status" data-codec-status></div></div></section>`;
    const inputModel = monaco.editor.createModel(initial, 'plaintext');
    const outputModel = monaco.editor.createModel('', 'plaintext');
    const inputEditor = monaco.editor.create(root.querySelector('#codec-input'), editorOptions('plaintext', { lineNumbers: 'off', folding: false, padding: { top: 12, bottom: 12 } }));
    const outputEditor = monaco.editor.create(root.querySelector('#codec-output'), editorOptions('plaintext', { readOnly: true, lineNumbers: 'off', folding: false, padding: { top: 12, bottom: 12 } }));
    inputEditor.setModel(inputModel); outputEditor.setModel(outputModel);
    const status = root.querySelector('[data-codec-status]');
    const autoLabel = root.querySelector('[data-codec-auto]');
    const modeSelect = root.querySelector('[data-codec-mode]');
    const formatSelect = root.querySelector('[data-codec-format]');
    const linesToggle = root.querySelector('[data-codec-lines]');
    setContext('');
    const transform = (text, lineNumber = 0) => {
      let active = selection;
      if (mode === 'decode' && selection === 'auto') active = detectFormat(text);
      if (mode === 'encode' && selection === 'auto') active = 'base64';
      if (!active) throw Error(`${lineNumber ? `Line ${lineNumber}: ` : ''}input does not match a supported encoding`);
      try { return mode === 'decode' ? strictDecode(active, text) : convert(active, text, false); }
      catch (error) { throw Error(`${lineNumber ? `Line ${lineNumber}: ` : ''}${error?.message || String(error)}`); }
    };
    const paint = () => {
      const text = inputModel.getValue();
      set('text', text); set('mode', mode); set('format', selection); set('lines', separateLines ? '1' : '0');
      linesToggle.setAttribute('aria-checked', String(separateLines));
      let active = selection;
      if (!separateLines && mode === 'decode' && selection === 'auto') active = detectFormat(text);
      if (!separateLines && mode === 'encode' && selection === 'auto') active = 'base64';
      autoLabel.innerHTML = selection === 'auto' ? (separateLines ? 'Detecting <strong>per line</strong>' : active ? `Detected <strong>${FORMATS.find(([value]) => value === active)?.[1] || active}</strong>` : 'No encoding detected') : '';
      if (!text) { outputModel.setValue(''); status.textContent = ''; status.classList.remove('danger'); return; }
      try {
        const output = separateLines
          ? text.split(/\r?\n/).map((line, index) => line ? transform(line, index + 1) : '').join('\n')
          : transform(text);
        outputModel.setValue(output);
        const suffix = separateLines ? ` · ${text.split(/\r?\n/).length.toLocaleString()} lines` : '';
        status.textContent = `${[...text].length.toLocaleString()} → ${[...output].length.toLocaleString()} chars${suffix}`;
        status.classList.remove('danger');
      } catch (error) {
        outputModel.setValue('');
        status.textContent = error?.message || String(error);
        status.classList.add('danger');
      }
    };
    modeSelect.onchange = () => { mode = modeSelect.value; paint(); };
    formatSelect.onchange = () => { selection = formatSelect.value; paint(); };
    linesToggle.onclick = () => { separateLines = !separateLines; paint(); };
    root.querySelector('[data-codec-copy]').onclick = () => copy(outputModel.getValue());
    const sub = inputModel.onDidChangeContent(paint);
    paint();
    disposeTool = () => { sub.dispose(); inputEditor.dispose(); outputEditor.dispose(); inputModel.dispose(); outputModel.dispose(); };
  }

  const LANGUAGES = [['plaintext', 'Plain text'], ['javascript', 'JavaScript'], ['typescript', 'TypeScript'], ['json', 'JSON'], ['html', 'HTML'], ['css', 'CSS'], ['markdown', 'Markdown'], ['python', 'Python'], ['rust', 'Rust'], ['go', 'Go'], ['java', 'Java'], ['cpp', 'C++'], ['c', 'C'], ['shell', 'Shell'], ['sql', 'SQL'], ['yaml', 'YAML'], ['xml', 'XML']];

  async function diffTool(generation) {
    loadingEditor();
    const monaco = await ensureMonaco();
    if (!currentRender(generation) || route() !== 'diff') return;
    const left = get('left', get('text', 'Hello World\n\nThis is the original text.'));
    const right = get('right', 'Hello World\n\nThis is the modified text.');
    let language = get('language', 'plaintext');
    await ensureLanguage(language);
    if (!currentRender(generation) || route() !== 'diff') return;

    root.innerHTML = '<section class="diff-monaco"><div id="diff-editor" class="monaco-host" aria-label="Editable diff"></div></section>';
    const original = monaco.editor.createModel(left, language);
    const modified = monaco.editor.createModel(right, language);
    const diffEditor = monaco.editor.createDiffEditor(root.querySelector('#diff-editor'), editorOptions(language, {
      folding:false,
      renderLineHighlight:'none',
      wordWrap:'off',
      fontSize:14,
      lineHeight:22,
      padding:{top:16,bottom:20},
      originalEditable:true,
      renderSideBySide:true,
      enableSplitViewResizing:true,
      useInlineViewWhenSpaceIsLimited:false,
      ignoreTrimWhitespace:true,
      renderIndicators:true,
      renderMarginRevertIcon:false,
      diffAlgorithm:'advanced',
      maxComputationTime:75,
      hideUnchangedRegions:{enabled:false},
    }));
    diffEditor.setModel({ original, modified });
    // localStorage is synchronous. Keep full-string persistence off the input
    // event so large documents remain responsive while Monaco's DiffEditor
    // handles line alignment, view zones, and character-level highlighting.
    let saveTimer = 0, originalDirty = false, modifiedDirty = false;
    const flushSave = () => {
      if (saveTimer) { clearTimeout(saveTimer); saveTimer = 0; }
      if (originalDirty) { set('left',original.getValue()); originalDirty = false; }
      if (modifiedDirty) { set('right',modified.getValue()); modifiedDirty = false; }
    };
    const scheduleSave = side => {
      if (side === 'original') originalDirty = true;
      else modifiedDirty = true;
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(flushSave,400);
    };
    const saveOnPageHide = () => flushSave();
    addEventListener('pagehide',saveOnPageHide);

    const setTopContext = () => {
      setContext(`<select data-diff-language aria-label="Syntax language">${LANGUAGES.map(([value,label]) => `<option value="${value}"${language===value?' selected':''}>${label}</option>`).join('')}</select><button type="button" data-diff-swap aria-label="Swap sides" title="Swap sides">${icon('swap')}</button>`);
      const languageSelect = context.querySelector('[data-diff-language]');
      languageSelect.onchange = async () => {
        language = languageSelect.value;
        set('language',language);
        await ensureLanguage(language);
        if (!currentRender(generation) || route() !== 'diff') return;
        monaco.editor.setModelLanguage(original,language);
        monaco.editor.setModelLanguage(modified,language);
      };
      context.querySelector('[data-diff-swap]').onclick = () => {
        const leftValue = original.getValue();
        const rightValue = modified.getValue();
        original.setValue(rightValue);
        modified.setValue(leftValue);
        originalDirty = modifiedDirty = true;
        flushSave();
      };
    };

    const a = original.onDidChangeContent(() => scheduleSave('original'));
    const b = modified.onDidChangeContent(() => scheduleSave('modified'));
    setTopContext();
    disposeTool = () => {
      flushSave();
      removeEventListener('pagehide',saveOnPageHide);
      a.dispose(); b.dispose();
      diffEditor.dispose();
      original.dispose(); modified.dispose();
    };
  }

  const digits = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  const clean = text => text.trim().replace(/[\s_,']/g, '');
  function parseN(text, base) {
    text = clean(text);
    if (!text) throw Error('Enter a number');
    let negative = text[0] === '-';
    if (negative || text[0] === '+') text = text.slice(1);
    if (base === 16) text = text.replace(/^0x/i, '');
    if (base === 8) text = text.replace(/^0o/i, '');
    if (base === 2) text = text.replace(/^0b/i, '');
    if (!text) throw Error('Enter a number');
    let value = 0n;
    for (const raw of text) {
      const char = base <= 36 ? raw.toUpperCase() : raw;
      const digit = digits.indexOf(char);
      if (digit < 0 || digit >= base) throw Error(`“${raw}” is not valid in base ${base}`);
      value = value * BigInt(base) + BigInt(digit);
    }
    return negative ? -value : value;
  }
  function fmt(value, base) {
    if (!value) return '0';
    const negative = value < 0n;
    if (negative) value = -value;
    let out = '';
    for (; value; value /= BigInt(base)) out = digits[Number(value % BigInt(base))] + out;
    return (negative ? '-' : '') + out;
  }
  const grouped = (value, size) => {
    const negative = value.startsWith('-'), raw = negative ? value.slice(1) : value, parts = [];
    for (let index = raw.length; index > 0; index -= size) parts.unshift(raw.slice(Math.max(0, index - size), index));
    return (negative ? '-' : '') + parts.join(' ');
  };

  function numberTool() {
    let base = Math.min(62, Math.max(2, +get('base', '10') || 10));
    let custom = Math.min(62, Math.max(2, +get('custom', '36') || 36));
    let text = get('text', '255');
    root.innerHTML = `<section class="number-tool"><div class="number-shell"><section class="number-input-pane"><label for="number-input">Input</label><input id="number-input" spellcheck="false" value="${esc(text)}"></section><div class="number-options" aria-label="Number options"><label><span>Source base</span><input id="source-base" type="number" min="2" max="62" value="${base}"></label><div class="radix-choices" aria-label="Common source bases">${[2, 8, 10, 16].map(value => `<button type="button" data-base="${value}">Base ${value}</button>`).join('')}</div><label><span>Custom output base</span><input id="custom-base" type="number" min="2" max="62" value="${custom}"></label></div><div class="number-error" id="number-error" hidden></div><section class="number-output-pane"><header><h1>Output</h1></header><div class="number-grid"></div><section class="bit-panel"><header><h2>Bits</h2><span id="bit-caption"></span></header><div id="bit-values" class="bit-values"></div></section></section></div></section>`;
    const input = root.querySelector('#number-input');
    const sourceBase = root.querySelector('#source-base');
    const customBase = root.querySelector('#custom-base');
    const grid = root.querySelector('.number-grid');
    const bits = root.querySelector('#bit-values');
    const caption = root.querySelector('#bit-caption');
    const error = root.querySelector('#number-error');
    let value = null;

    const definitions = () => [
      ['binary', 'Binary', 2, 4],
      ['octal', 'Octal', 8, 3],
      ['decimal', 'Decimal', 10, 3],
      ['hex', 'Hexadecimal', 16, 4],
      ['custom', `Base ${custom}`, custom, 4],
    ];
    const buildCards = () => {
      grid.innerHTML = definitions().map(([key, label, radix]) => `<div class="number-card" data-number-card="${key}"><header><span>${label}</span><small>base ${radix}</small></header><input data-number-radix="${radix}" aria-label="${label}" spellcheck="false"><button type="button" data-copy-number aria-label="Copy value" title="Copy value">${icon('copy')}</button></div>`).join('');
    };
    const updateCards = activeField => {
      for (const [key, label, radix, group] of definitions()) {
        const card = grid.querySelector(`[data-number-card="${key}"]`);
        if (!card) continue;
        card.querySelector('header span').textContent = label;
        card.querySelector('header small').textContent = `base ${radix}`;
        const field = card.querySelector('[data-number-radix]');
        field.dataset.numberRadix = String(radix);
        const raw = value === null ? '' : fmt(value, radix);
        if (field !== activeField) field.value = value === null ? '' : grouped(raw, group);
        const copyButton = card.querySelector('[data-copy-number]');
        copyButton.dataset.copyNumber = raw;
        copyButton.disabled = value === null;
      }
    };
    const paint = activeField => {
      try {
        value = parseN(text, base);
        error.hidden = true;
        error.textContent = '';
      } catch (err) {
        value = null;
        error.hidden = false;
        error.textContent = err?.message || String(err);
      }
      root.querySelectorAll('[data-base]').forEach(button => button.toggleAttribute('data-active', +button.dataset.base === base));
      updateCards(activeField);
      if (value === null) {
        bits.innerHTML = '';
        caption.textContent = '';
      } else {
        const abs = value < 0n ? -value : value;
        const bitCount = Math.max(1, abs.toString(2).length);
        const raw = abs.toString(2).padStart(Math.ceil(bitCount / 4) * 4, '0');
        bits.innerHTML = (raw.match(/.{1,4}/g) || []).map(group => `<code>${group}</code>`).join('');
        caption.textContent = `${bitCount} bit${bitCount === 1 ? '' : 's'} · ${Math.ceil(bitCount / 8)} byte${Math.ceil(bitCount / 8) === 1 ? '' : 's'}`;
      }
      set('text', text);
      set('base', base);
      set('custom', custom);
      setContext(value === null ? '<span class="danger">Invalid value</span>' : '');
    };

    buildCards();
    input.oninput = () => { text = input.value; paint(); };
    sourceBase.onchange = () => {
      base = Math.min(62, Math.max(2, +sourceBase.value || 2));
      sourceBase.value = String(base);
      paint();
    };
    customBase.onchange = () => {
      custom = Math.min(62, Math.max(2, +customBase.value || 2));
      customBase.value = String(custom);
      paint();
    };
    root.querySelector('.radix-choices').onclick = event => {
      const button = event.target.closest('[data-base]');
      if (!button) return;
      base = +button.dataset.base;
      sourceBase.value = String(base);
      paint();
    };
    grid.addEventListener('input', event => {
      const field = event.target.closest('[data-number-radix]');
      if (!field) return;
      base = +field.dataset.numberRadix;
      text = clean(field.value);
      sourceBase.value = String(base);
      input.value = text;
      paint(field);
    });
    grid.addEventListener('change', event => {
      const field = event.target.closest('[data-number-radix]');
      if (field) paint();
    });
    grid.addEventListener('click', event => {
      const button = event.target.closest('[data-copy-number]');
      if (button && !button.disabled) copy(button.dataset.copyNumber);
    });
    paint();
    disposeTool = () => {};
  }


  async function markdownTool(generation) {
    loadingEditor();
    const monaco = await ensureMonaco();
    if (!currentRender(generation) || route() !== 'markdown') return;
    await ensureLanguage('markdown');
    if (!currentRender(generation) || route() !== 'markdown') return;
    const value = get('text', '# Markdown\n\n**Bold**, *italic*, `code`.\n\n- Live local preview\n- Source-aware linked scrolling');
    let linked = localGet('markdown','linked','1') !== '0';
    let viewMode = localGet('markdown','view','combined');
    if (!['combined','source','preview'].includes(viewMode)) viewMode='combined';
    root.innerHTML = `<section class="markdown-tool" data-view="${viewMode}"><div class="markdown-source"><div id="md-input" class="monaco-host"></div></div><article id="md-output" class="markdown-preview"></article></section>`;
    const model = monaco.editor.createModel(value,'markdown');
    const editor = monaco.editor.create(root.querySelector('#md-input'),editorOptions('markdown')); editor.setModel(model);
    const output=root.querySelector('#md-output');
    let syncing=false, sourceEntries=[];
    const rebuildMap=()=>{ const rootRect=output.getBoundingClientRect(); sourceEntries=[...output.querySelectorAll('[data-source-start]')].map(el=>{const rect=el.getBoundingClientRect();return{start:+el.dataset.sourceStart,end:+el.dataset.sourceEnd,top:rect.top-rootRect.top+output.scrollTop,bottom:rect.bottom-rootRect.top+output.scrollTop}}).filter(entry=>Number.isFinite(entry.start)&&Number.isFinite(entry.end)); };
    const sourceToPreview=position=>{const direct=sourceEntries.find(entry=>position>=entry.start&&position<=entry.end);if(direct)return direct.top+(position-direct.start)/Math.max(1,direct.end-direct.start)*Math.max(1,direct.bottom-direct.top);const next=sourceEntries.find(entry=>entry.start>=position);return next?.top??output.scrollHeight};
    const previewToSource=y=>{const direct=sourceEntries.find(entry=>y>=entry.top&&y<=entry.bottom);if(direct)return direct.start+(y-direct.top)/Math.max(1,direct.bottom-direct.top)*Math.max(1,direct.end-direct.start);let prior=sourceEntries[0];for(const entry of sourceEntries){if(entry.top>y)break;prior=entry}return prior?.end??0};
    const editorSourcePosition=()=>{const line=editor.getVisibleRanges()[0]?.startLineNumber||1;const top=editor.getTopForLineNumber(line);const next=line<model.getLineCount()?editor.getTopForLineNumber(line+1):top+editor.getOption(monaco.editor.EditorOption.lineHeight);return line-1+Math.max(0,Math.min(1,(editor.getScrollTop()-top)/Math.max(1,next-top)))};
    const syncPreview=()=>{if(!linked||syncing||!sourceEntries.length||viewMode==='source')return;syncing=true;output.scrollTop=Math.max(0,sourceToPreview(editorSourcePosition())-24);requestAnimationFrame(()=>{syncing=false})};
    const syncEditor=()=>{if(!linked||syncing||!sourceEntries.length||viewMode==='preview')return;syncing=true;const pos=previewToSource(output.scrollTop+24);const line=Math.max(1,Math.min(model.getLineCount(),Math.floor(pos)+1));const top=editor.getTopForLineNumber(line);const next=line<model.getLineCount()?editor.getTopForLineNumber(line+1):top+editor.getOption(monaco.editor.EditorOption.lineHeight);editor.setScrollTop(top+(pos-Math.floor(pos))*Math.max(1,next-top),monaco.editor.ScrollType.Immediate);requestAnimationFrame(()=>{syncing=false})};
    const contextMarkup=()=>`<span class="markdown-view-toggle" role="group" aria-label="Markdown view"><button type="button" data-md-view="combined" aria-pressed="${viewMode==='combined'}">Combined</button><button type="button" data-md-view="source" aria-pressed="${viewMode==='source'}">Source</button><button type="button" data-md-view="preview" aria-pressed="${viewMode==='preview'}">Preview</button></span><button type="button" data-md-link aria-pressed="${linked}" aria-label="Toggle linked scrolling" title="Toggle linked scrolling">${icon('link')}</button>`;
    const bindContext=()=>{
      setContext(contextMarkup());
      context.querySelectorAll('[data-md-view]').forEach(button=>button.onclick=()=>{viewMode=button.dataset.mdView;localSet('markdown','view',viewMode);root.querySelector('.markdown-tool').dataset.view=viewMode;bindContext();requestAnimationFrame(()=>{editor.layout();rebuildMap();if(linked&&viewMode==='combined')syncPreview()})});
      context.querySelector('[data-md-link]').onclick=()=>{linked=!linked;localSet('markdown','linked',linked?'1':'0');bindContext();if(linked)syncPreview()};
    };
    const paint=()=>{const text=model.getValue();set('text',text);output.innerHTML=renderMarkdown(text);rebuildMap();bindContext();if(linked)syncPreview()};
    const change=model.onDidChangeContent(paint);const scroll=editor.onDidScrollChange(event=>{if(event.scrollTopChanged)syncPreview()});output.addEventListener('scroll',syncEditor,{passive:true});paint();
    disposeTool=()=>{change.dispose();scroll.dispose();output.removeEventListener('scroll',syncEditor);editor.dispose();model.dispose()};
  }

  function render() {
    const generation = ++renderGeneration;
    try { disposeTool(); } catch {}
    disposeTool = () => {};
    const tool = route();
    const run = ({ text: textTool, base: baseTool, diff: diffTool, number: numberTool, markdown: markdownTool })[tool] || textTool;
    document.title = `${TOOLS.find(({ id }) => id === tool)?.title || 'Tools'} · Sanyam Brar`;
    Promise.resolve(run(generation)).catch(error => {
      if (!currentRender(generation)) return;
      root.innerHTML = `<div class="tool-fatal"><strong>Editor failed to load.</strong><span>${esc(error?.message || String(error))}</span><button type="button">Retry</button></div>`;
      root.querySelector('button').onclick = render;
      setContext('');
    });
  }

  render();
  return () => {
    disposed = true;
    renderGeneration++;
    try { disposeTool(); } catch {}
    setContext('');
    if (monacoThemeListener) removeEventListener('samey-themechange', monacoThemeListener);
  };
}
