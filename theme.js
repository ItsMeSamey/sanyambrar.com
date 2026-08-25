(() => {
  const SCRIPT_ROOT = new URL(".", document.currentScript?.src || location.href);
  const KEY = "keybr.theme";
  const WORDLE_KEY = "ui-theme";
  const defaults = {
    light: { tone: "light", background: "#ffffff", text: "#121213", accent: "#787c7e", error: "#ff3333" },
    "clear-light": { tone: "light", background: "#faf9f8", text: "#202332", accent: "#355d82", error: "#c43d46" },
    dark: { tone: "dark", background: "#121213", text: "#f8f8f8", accent: "#a7a7a7", error: "#9b4545" },
    "clear-dark": { tone: "dark", background: "#303237", text: "#b0b4bd", accent: "#7c9fc4", error: "#e2848b" },
  };
  const labels = { system: "System", light: "Light", "clear-light": "Clear light", dark: "Dark", "clear-dark": "Clear dark" };

  const validHex = (v) => typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v);
  const mix = (a, b, weight) => {
    const rgb = (v) => [1, 3, 5].map((i) => parseInt(v.slice(i, i + 2), 16));
    const aa = rgb(a), bb = rgb(b);
    return "#" + aa.map((v, i) => Math.round(v * (1 - weight) + bb[i] * weight).toString(16).padStart(2, "0")).join("");
  };
  const hsl = (hex) => {
    let [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
    if (max === min) return `0 0% ${+(l * 100).toFixed(2)}%`;
    const d = max - min;
    const s = l > .5 ? d / (2 - max - min) : d / (max + min);
    let h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return `${+((h / 6) * 360).toFixed(2)} ${+(s * 100).toFixed(2)}% ${+(l * 100).toFixed(2)}%`;
  };
  const rawTheme = () => {
    try { return JSON.parse(localStorage.getItem(KEY) || "null") || {}; } catch { return {}; }
  };
  const read = () => {
    const raw = rawTheme();
    let color = raw.color;
    if (color === "system" || !["light", "clear-light", "dark", "clear-dark", "custom"].includes(color)) {
      color = window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    if (color !== "custom") return { color, selected: raw.color || "system", ...defaults[color] };
    const c = raw.custom || {};
    const fallback = c.tone === "dark" ? defaults.dark : defaults.light;
    return {
      color, selected: "custom", tone: c.tone === "dark" ? "dark" : "light",
      background: validHex(c.background) ? c.background.toLowerCase() : fallback.background,
      text: validHex(c.text) ? c.text.toLowerCase() : fallback.text,
      accent: validHex(c.accent) ? c.accent.toLowerCase() : fallback.accent,
      error: validHex(c.error) ? c.error.toLowerCase() : fallback.error,
    };
  };
  const nativeSetItem = Storage.prototype.setItem;
  const apply = () => {
    const t = read();
    const root = document.documentElement;
    root.dataset.siteTheme = t.color;
    root.dataset.kbTheme = t.tone;
    if (t.color !== "custom") root.dataset.color = t.color;
    else root.removeAttribute("data-color");
    root.classList.toggle("dark", t.tone === "dark");
    root.style.colorScheme = t.tone;
    const line = mix(t.text, t.background, t.tone === "dark" ? .72 : .82);
    const soft = mix(t.text, t.background, t.tone === "dark" ? .9 : .96);
    root.style.setProperty("--site-bg", t.background);
    root.style.setProperty("--site-fg", t.text);
    root.style.setProperty("--site-muted", mix(t.text, t.background, .42));
    root.style.setProperty("--site-line", line);
    root.style.setProperty("--site-soft", soft);
    root.style.setProperty("--site-accent", t.accent);
    root.style.setProperty("--site-error", t.error);
    root.style.setProperty("--background", hsl(t.background));
    root.style.setProperty("--foreground", hsl(t.text));
    root.style.setProperty("--card", hsl(t.background));
    root.style.setProperty("--card-foreground", hsl(t.text));
    root.style.setProperty("--popover", hsl(t.background));
    root.style.setProperty("--popover-foreground", hsl(t.text));
    root.style.setProperty("--primary", hsl(t.text));
    root.style.setProperty("--primary-foreground", hsl(t.background));
    root.style.setProperty("--secondary", hsl(soft));
    root.style.setProperty("--secondary-foreground", hsl(t.text));
    root.style.setProperty("--muted", hsl(soft));
    root.style.setProperty("--muted-foreground", hsl(mix(t.text, t.background, .42)));
    root.style.setProperty("--accent", hsl(soft));
    root.style.setProperty("--accent-foreground", hsl(t.text));
    root.style.setProperty("--border", hsl(line));
    root.style.setProperty("--input", hsl(line));
    root.style.setProperty("--ring", hsl(t.accent));
    root.style.setProperty("--error-foreground", hsl(t.error));
    try { nativeSetItem.call(localStorage, WORDLE_KEY, t.tone); } catch {}
    document.querySelectorAll('[data-theme-choice]').forEach((el) => el.toggleAttribute('data-selected', el.dataset.themeChoice === t.selected));
    return t;
  };

  Storage.prototype.setItem = function (key, value) {
    nativeSetItem.call(this, key, value);
    if (this === localStorage && key === KEY) queueMicrotask(apply);
    if (this === localStorage && key === WORDLE_KEY && (value === "light" || value === "dark")) {
      const raw = rawTheme();
      if (raw.color !== value) nativeSetItem.call(localStorage, KEY, JSON.stringify({ ...raw, color: value }));
      queueMicrotask(apply);
    }
  };

  const icon = (name) => name === 'home'
    ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5v8a1 1 0 0 1-1 1h-5.5v-6h-5v6H4a1 1 0 0 1-1-1z"/></svg>'
    : '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42"/></svg>';

  const mountControls = () => {
    if (document.getElementById('samey-site-controls')) return;
    const host = document.createElement('div');
    host.id = 'samey-site-controls';
    host.className = 'samey-site-controls';
    const home = document.documentElement.dataset.homeHref;
    if (home) host.insertAdjacentHTML('beforeend', `<a class="samey-icon" href="${home}" aria-label="Home" title="Home">${icon('home')}</a>`);
    host.insertAdjacentHTML('beforeend', `<button class="samey-icon" type="button" aria-label="Theme" title="Theme" aria-expanded="false">${icon('theme')}</button>`);
    const panel = document.createElement('div');
    panel.className = 'samey-theme-panel';
    panel.hidden = true;
    panel.innerHTML = Object.entries(labels).map(([value,label]) => `<button type="button" data-theme-choice="${value}">${label}</button>`).join('') + `<a href="${document.documentElement.dataset.themeSettingsHref || './keybr.html'}">Custom theme <span>↗</span></a>`;
    host.append(panel);
    document.body.append(host);
    const trigger = host.querySelector('.samey-icon[type=button]');
    trigger.addEventListener('click', () => { panel.hidden = !panel.hidden; trigger.setAttribute('aria-expanded', String(!panel.hidden)); });
    panel.addEventListener('click', (e) => {
      const button = e.target.closest('[data-theme-choice]');
      if (!button) return;
      const raw = rawTheme();
      nativeSetItem.call(localStorage, KEY, JSON.stringify({ ...raw, color: button.dataset.themeChoice }));
      apply();
      panel.hidden = true;
      trigger.setAttribute('aria-expanded', 'false');
    });
    document.addEventListener('pointerdown', (e) => { if (!host.contains(e.target)) { panel.hidden = true; trigger.setAttribute('aria-expanded','false'); } });
    apply();
  };

  const css = document.createElement('style');
  css.textContent = `.samey-site-controls{position:fixed;top:10px;right:12px;z-index:10000;display:flex;gap:2px;align-items:center}.samey-icon{appearance:none;border:0;background:transparent;color:var(--site-fg,var(--secondary,#121213));width:36px;height:36px;padding:8px;display:grid;place-items:center;cursor:pointer;border-radius:3px}.samey-icon:hover,.samey-icon:focus-visible{background:var(--site-soft,var(--primary-d1,#eee));outline:none}.samey-icon svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.samey-theme-panel{position:absolute;right:0;top:42px;min-width:154px;padding:4px;background:var(--site-bg,var(--primary,#fff));color:var(--site-fg,var(--secondary,#121213));border:1px solid var(--site-line,var(--primary-d1,#ddd));box-shadow:0 .5rem 2rem #0002}.samey-theme-panel[hidden]{display:none}.samey-theme-panel button,.samey-theme-panel a{width:100%;border:0;background:transparent;color:inherit;text-align:left;padding:8px 10px;font:inherit;font-size:13px;display:flex;justify-content:space-between;cursor:pointer}.samey-theme-panel button:hover,.samey-theme-panel a:hover,.samey-theme-panel button[data-selected]{background:var(--site-soft,var(--primary-d1,#eee))}.samey-theme-panel button[data-selected]::after{content:'•'}.samey-theme-panel a{border-top:1px solid var(--site-line,var(--primary-d1,#ddd));margin-top:4px;text-decoration:none}@media(max-width:520px){.samey-site-controls{top:8px;right:8px}}`;
  document.head.append(css);

  window.addEventListener("storage", (event) => { if (event.key === KEY) apply(); });
  window.matchMedia?.("(prefers-color-scheme: dark)").addEventListener?.("change", () => {
    const raw = rawTheme();
    if (!raw.color || raw.color === "system") apply();
  });
  window.SameyTheme = { apply, read };
  apply();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountControls, {once:true}); else mountControls();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register(new URL('sw.js', SCRIPT_ROOT).href).catch(() => {});
})();
