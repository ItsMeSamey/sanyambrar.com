const keywords = new Set([
  'alignas','alignof','and','and_eq','asm','auto','bitand','bitor','break','case','catch','class','compl','concept','const','consteval','constexpr','constinit','const_cast','continue','co_await','co_return','co_yield','decltype','default','delete','do','dynamic_cast','else','enum','explicit','export','extern','false','for','friend','goto','if','inline','mutable','namespace','new','noexcept','not','not_eq','nullptr','operator','or','or_eq','private','protected','public','register','reinterpret_cast','requires','return','sizeof','static','static_assert','static_cast','struct','switch','template','this','thread_local','throw','true','try','typedef','typeid','typename','union','using','virtual','volatile','while','xor','xor_eq',
]);
const types = new Set([
  'bool','char','char8_t','char16_t','char32_t','double','float','int','long','short','signed','unsigned','void','wchar_t','size_t','uint64_t','atomic','mutex','condition_variable','unique_lock','chrono','string','optional','guard',
]);
const constants = new Set(['memory_order_relaxed','memory_order_acquire','memory_order_release','memory_order_acq_rel','memory_order_seq_cst']);

const esc = (text: string) => text.replace(/[&<>]/g, char => char === '&' ? '&amp;' : char === '<' ? '&lt;' : '&gt;');
const token = (kind: string, text: string) => `<span class="syn-${kind}">${esc(text)}</span>`;
const identStart = (char: string) => /[A-Za-z_]/.test(char);
const identPart = (char: string) => /[A-Za-z0-9_]/.test(char);

export function highlightCpp(source: string): string {
  let out = '', i = 0, lineStart = true;
  while (i < source.length) {
    const char = source[i], next = source[i + 1] ?? '';
    if (char === '\n') { out += '\n'; i++; lineStart = true; continue; }
    if (/\s/.test(char)) { out += char; i++; continue; }

    if (lineStart && char === '#') {
      const end = source.indexOf('\n', i);
      const stop = end < 0 ? source.length : end;
      out += token('preproc', source.slice(i, stop));
      i = stop; lineStart = false; continue;
    }
    lineStart = false;

    if (char === '/' && next === '/') {
      const end = source.indexOf('\n', i);
      const stop = end < 0 ? source.length : end;
      out += token('comment', source.slice(i, stop));
      i = stop; continue;
    }
    if (char === '/' && next === '*') {
      const end = source.indexOf('*/', i + 2);
      const stop = end < 0 ? source.length : end + 2;
      out += token('comment', source.slice(i, stop));
      i = stop; continue;
    }
    if (char === '"' || char === "'") {
      const quote = char;
      let j = i + 1;
      while (j < source.length) {
        if (source[j] === '\\') { j += 2; continue; }
        if (source[j++] === quote) break;
      }
      out += token('string', source.slice(i, j));
      i = j; continue;
    }
    if (/\d/.test(char)) {
      let j = i + 1;
      while (j < source.length && /[0-9A-Fa-f_xX.'uUlL]/.test(source[j])) j++;
      out += token('number', source.slice(i, j));
      i = j; continue;
    }
    if (identStart(char)) {
      let j = i + 1;
      while (j < source.length && identPart(source[j])) j++;
      const word = source.slice(i, j);
      let kind = keywords.has(word) ? 'keyword' : types.has(word) ? 'type' : constants.has(word) ? 'constant' : '';
      if (!kind) {
        let k = j;
        while (k < source.length && /\s/.test(source[k])) k++;
        if (source[k] === '(') kind = 'function';
        else if (word === 'std') kind = 'namespace';
      }
      out += kind ? token(kind, word) : esc(word);
      i = j; continue;
    }
    out += esc(char);
    i++;
  }
  return out;
}

export function highlightBlogCode(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('pre > code, .cas-code code').forEach(code => {
    if (code.dataset.highlighted) return;
    code.innerHTML = highlightCpp(code.textContent ?? '');
    code.dataset.highlighted = 'cpp';
  });
}
