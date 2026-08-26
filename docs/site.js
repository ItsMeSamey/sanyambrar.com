(() => {
  const SCRIPT_ROOT = new URL('.', document.currentScript?.src || location.href);
  const index = globalThis.SameySiteIndex || [];
  const norm = s => s.toLowerCase();
  const score = (item, q) => {
    const text = norm(`${item.title} ${item.kind} ${item.note} ${(item.tags || []).join(' ')}`);
    const title = norm(item.title);
    if (!q) return 1;
    if (title === q) return 100;
    if (title.startsWith(q)) return 70;
    if (title.includes(q)) return 50;
    const words = q.split(/\s+/).filter(Boolean);
    return words.every(w => text.includes(w)) ? 20 + words.length : 0;
  };

  let box, input, results, active = 0, visible = [];
  const render = () => {
    const q = norm(input.value.trim());
    visible = index.map(item => [item, score(item, q)]).filter(x => x[1] > 0).sort((a,b) => b[1] - a[1] || a[0].title.localeCompare(b[0].title)).slice(0, 9).map(x => x[0]);
    active = Math.min(active, Math.max(0, visible.length - 1));
    results.innerHTML = visible.map((item, i) => `<a class="search-result${i===active?' active':''}" href="${new URL(item.href, SCRIPT_ROOT).href}"><span><b>${item.title}</b><small>${item.note}</small></span><em>${item.kind}</em></a>`).join('') || '<div class="search-empty">No match</div>';
  };
  const ensure = () => {
    if (box) return;
    box = document.createElement('div');
    box.className = 'site-search';
    box.hidden = true;
    box.innerHTML = '<div class="site-search-backdrop" data-close-search></div><div class="site-search-panel" role="dialog" aria-modal="true" aria-label="Search"><div class="site-search-input"><span>›</span><input autocomplete="off" spellcheck="false" placeholder="Search games, tools, writing, work…"><kbd>esc</kbd></div><div class="site-search-results"></div></div>';
    document.body.append(box);
    input = box.querySelector('input'); results = box.querySelector('.site-search-results');
    input.addEventListener('input', () => { active = 0; render(); });
    box.addEventListener('click', e => { if (e.target.closest('[data-close-search]')) close(); });
    input.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); active = (active + (e.key === 'ArrowDown' ? 1 : visible.length - 1)) % Math.max(visible.length, 1); render(); }
      if (e.key === 'Enter' && visible[active]) { e.preventDefault(); location.href = visible[active].href; }
    });
  };
  const open = () => { ensure(); box.hidden = false; active = 0; input.value = ''; render(); requestAnimationFrame(() => input.focus()); };
  const close = () => { if (box) box.hidden = true; };
  addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); box && !box.hidden ? close() : open(); }
    else if (e.key === 'Escape') close();
  });
  document.addEventListener('click', e => { if (e.target.closest('[data-open-search]')) open(); });

  const bits = n => n.toString(2).padStart(8, '0');
  const floatPanel = el => {
    const input = el.querySelector('input'), out = el.querySelector('pre');
    const update = () => {
      const b = new ArrayBuffer(4), f = new Float32Array(b), u = new Uint32Array(b); f[0] = Number(input.value);
      const x = u[0] >>> 0, sign = x >>> 31, exp = (x >>> 23) & 255, mant = x & 0x7fffff;
      out.textContent = `${sign}  ${exp.toString(2).padStart(8,'0')}  ${mant.toString(2).padStart(23,'0')}\nsign       exponent                  mantissa\nhex  0x${x.toString(16).padStart(8,'0')}\nexp  ${exp} → ${exp === 0 ? 'subnormal/zero' : exp === 255 ? 'special' : exp - 127}`;
    }; input.addEventListener('input', update); update();
  };
  const unicodePanel = el => {
    const input = el.querySelector('textarea'), out = el.querySelector('pre'), enc = new TextEncoder();
    const update = () => out.textContent = [...input.value].map(c => { const cp = c.codePointAt(0); return `${c === ' ' ? '␠' : c}  U+${cp.toString(16).toUpperCase().padStart(4,'0')}  ${[...enc.encode(c)].map(x=>x.toString(16).padStart(2,'0')).join(' ')}`; }).join('\n');
    input.addEventListener('input', update); update();
  };
  const hashPanel = el => {
    const inputs = [...el.querySelectorAll('input')], out = el.querySelector('pre'), enc = new TextEncoder(); let seq = 0;
    const update = async () => { const mine = ++seq; const hs = await Promise.all(inputs.map(x => crypto.subtle.digest('SHA-256', enc.encode(x.value)).then(b => new Uint8Array(b)))); if (mine !== seq) return; let d = 0; for (let i=0;i<32;i++) d += bits(hs[0][i]^hs[1][i]).replace(/0/g,'').length; out.textContent = `${[...hs[0]].map(x=>x.toString(16).padStart(2,'0')).join('')}\n${[...hs[1]].map(x=>x.toString(16).padStart(2,'0')).join('')}\n\n${d} / 256 bits differ`; };
    inputs.forEach(x => x.addEventListener('input', update)); update();
  };
  document.querySelectorAll('[data-lab]').forEach(el => ({float:floatPanel,unicode:unicodePanel,hash:hashPanel}[el.dataset.lab]?.(el)));
})();
