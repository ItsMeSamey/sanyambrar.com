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
  const shortcutLabel = /Mac|iPhone|iPad|iPod/i.test(navigator.userAgentData?.platform || navigator.platform || navigator.userAgent) ? '⌘ K' : 'Ctrl K';
  const syncShortcutLabels = () => document.querySelectorAll('[data-search-shortcut]').forEach(el => { el.textContent = shortcutLabel; });
  syncShortcutLabels();
  addEventListener('samey-pageload', syncShortcutLabels);

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
    box.dataset.sameyRuntime = '';
    box.hidden = true;
    box.innerHTML = '<div class="site-search-backdrop" data-close-search></div><div class="site-search-panel" role="dialog" aria-modal="true" aria-label="Search"><div class="site-search-input"><span>›</span><input autocomplete="off" spellcheck="false" placeholder="Search games, tools, writing, work…"><kbd>esc</kbd></div><div class="site-search-results"></div></div>';
    document.body.append(box);
    input = box.querySelector('input'); results = box.querySelector('.site-search-results');
    input.addEventListener('input', () => { active = 0; render(); });
    box.addEventListener('click', e => { if (e.target.closest('[data-close-search]')) close(); });
    input.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); active = (active + (e.key === 'ArrowDown' ? 1 : visible.length - 1)) % Math.max(visible.length, 1); render(); }
      if (e.key === 'Enter' && visible[active]) { e.preventDefault(); close(); const href = visible[active].href; globalThis.SameyNavigate?.(href); }
    });
  };
  const open = () => { ensure(); box.hidden = false; active = 0; input.value = ''; render(); requestAnimationFrame(() => input.focus()); };
  const close = () => { if (box) box.hidden = true; };
  addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); box && !box.hidden ? close() : open(); }
    else if (e.key === 'Escape') close();
  });
  document.addEventListener('click', e => { if (e.target.closest('[data-open-search]')) open(); });

})();
