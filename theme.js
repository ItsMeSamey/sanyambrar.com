(() => {
  const SCRIPT_ROOT = new URL(".", document.currentScript?.src || location.href);
  const KEY = "keybr.theme";
  const WORDLE_KEY = "ui-theme";
  const COLOR_IDS = ["light", "clear-light", "dark", "clear-dark", "custom"];
  const FONT_IDS = ["sans-serif", "serif", "monospace", "cursive"];
  const colors = {
    light: { tone: "light", background: "#ffffff", text: "#121213", accent: "#787c7e", error: "#ff3333" },
    "clear-light": { tone: "light", background: "#faf9f8", text: "#202332", accent: "#355d82", error: "#c43d46" },
    dark: { tone: "dark", background: "#121213", text: "#f8f8f8", accent: "#a7a7a7", error: "#9b4545" },
    "clear-dark": { tone: "dark", background: "#303237", text: "#b0b4bd", accent: "#7c9fc4", error: "#e2848b" },
  };
  const colorLabels = { system: "System", light: "Light", "clear-light": "Clear light", dark: "Dark", "clear-dark": "Clear dark" };
  const fontLabels = { "sans-serif": "Sans serif", serif: "Serif", monospace: "Monospace", cursive: "Cursive" };
  const fontStacks = {
    "sans-serif": 'system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
    serif: 'ui-serif,Georgia,Cambria,"Times New Roman",serif',
    monospace: 'ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono",monospace',
    cursive: 'cursive',
  };

  const validHex = (value) => typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
  const mix = (a, b, weight) => {
    const rgb = (value) => [1, 3, 5].map((i) => parseInt(value.slice(i, i + 2), 16));
    const aa = rgb(a), bb = rgb(b);
    return "#" + aa.map((value, i) => Math.round(value * (1 - weight) + bb[i] * weight).toString(16).padStart(2, "0")).join("");
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
  const rawPrefs = () => {
    try { return JSON.parse(localStorage.getItem(KEY) || "null") || {}; } catch { return {}; }
  };
  const read = () => {
    const raw = rawPrefs();
    let selected = raw.color;
    let color = selected;
    if (color === "system" || !COLOR_IDS.includes(color)) color = matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    const font = FONT_IDS.includes(raw.font) ? raw.font : "sans-serif";
    if (color !== "custom") return { color, selected: selected || "system", font, ...colors[color] };
    const custom = raw.custom || {};
    const fallback = custom.tone === "dark" ? colors.dark : colors.light;
    return {
      color,
      selected: "custom",
      font,
      tone: custom.tone === "dark" ? "dark" : "light",
      background: validHex(custom.background) ? custom.background.toLowerCase() : fallback.background,
      text: validHex(custom.text) ? custom.text.toLowerCase() : fallback.text,
      accent: validHex(custom.accent) ? custom.accent.toLowerCase() : fallback.accent,
      error: validHex(custom.error) ? custom.error.toLowerCase() : fallback.error,
    };
  };

  const nativeSetItem = Storage.prototype.setItem;
  let notifying = false;
  const notify = (theme) => {
    if (notifying) return;
    notifying = true;
    dispatchEvent(new CustomEvent("samey-themechange", { detail: theme }));
    notifying = false;
  };
  const apply = () => {
    const theme = read();
    const root = document.documentElement;
    root.dataset.siteTheme = theme.color;
    root.dataset.kbTheme = theme.tone;
    root.dataset.font = theme.font;
    if (theme.color !== "custom") root.dataset.color = theme.color;
    else if (root.dataset.siteKind !== "keybr") root.removeAttribute("data-color");
    root.classList.toggle("dark", theme.tone === "dark");
    root.style.colorScheme = theme.tone;

    const line = mix(theme.text, theme.background, theme.tone === "dark" ? .72 : .82);
    const soft = mix(theme.text, theme.background, theme.tone === "dark" ? .9 : .96);
    root.style.setProperty("--site-bg", theme.background);
    root.style.setProperty("--site-fg", theme.text);
    root.style.setProperty("--site-muted", mix(theme.text, theme.background, .42));
    root.style.setProperty("--site-line", line);
    root.style.setProperty("--site-soft", soft);
    root.style.setProperty("--site-accent", theme.accent);
    root.style.setProperty("--site-error", theme.error);
    root.style.setProperty("--site-font", fontStacks[theme.font]);

    // Wordle uses Tailwind/shadcn-style variables whose names collide with
    // Keybr's palette variables. Never install these variables on Keybr.
    if (root.dataset.siteKind === "wordle") {
      root.style.setProperty("--background", hsl(theme.background));
      root.style.setProperty("--foreground", hsl(theme.text));
      root.style.setProperty("--card", hsl(theme.background));
      root.style.setProperty("--card-foreground", hsl(theme.text));
      root.style.setProperty("--popover", hsl(theme.background));
      root.style.setProperty("--popover-foreground", hsl(theme.text));
      root.style.setProperty("--primary", hsl(theme.text));
      root.style.setProperty("--primary-foreground", hsl(theme.background));
      root.style.setProperty("--secondary", hsl(soft));
      root.style.setProperty("--secondary-foreground", hsl(theme.text));
      root.style.setProperty("--muted", hsl(soft));
      root.style.setProperty("--muted-foreground", hsl(mix(theme.text, theme.background, .42)));
      root.style.setProperty("--accent", hsl(soft));
      root.style.setProperty("--accent-foreground", hsl(theme.text));
      root.style.setProperty("--border", hsl(line));
      root.style.setProperty("--input", hsl(line));
      root.style.setProperty("--ring", hsl(theme.accent));
      root.style.setProperty("--error-foreground", hsl(theme.error));
      try { nativeSetItem.call(localStorage, WORDLE_KEY, theme.tone); } catch {}
    }

    document.querySelectorAll("[data-theme-choice]").forEach((el) => el.toggleAttribute("data-selected", el.dataset.themeChoice === theme.selected));
    document.querySelectorAll("[data-font-choice]").forEach((el) => el.toggleAttribute("data-selected", el.dataset.fontChoice === theme.font));
    notify(theme);
    return theme;
  };

  Storage.prototype.setItem = function (key, value) {
    nativeSetItem.call(this, key, value);
    if (this === localStorage && key === KEY) queueMicrotask(apply);
    if (this === localStorage && key === WORDLE_KEY && (value === "light" || value === "dark")) {
      const raw = rawPrefs();
      if (raw.color !== value) nativeSetItem.call(localStorage, KEY, JSON.stringify({ ...raw, color: value }));
      queueMicrotask(apply);
    }
  };

  const icon = (name) => name === "home"
    ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5v8a1 1 0 0 1-1 1h-5.5v-6h-5v6H4a1 1 0 0 1-1-1z"/></svg>'
    : '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M2 12h3M19 12h3M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12"/></svg>';

  const setPrefs = (patch) => {
    const raw = rawPrefs();
    nativeSetItem.call(localStorage, KEY, JSON.stringify({ ...raw, ...patch }));
    apply();
  };
  const section = (title, items, attr) => `<div class="samey-panel-title">${title}</div>${Object.entries(items).map(([value, label]) => `<button type="button" ${attr}="${value}">${label}</button>`).join("")}`;
  const mountControls = () => {
    if (document.getElementById("samey-site-controls")) return;
    const host = document.createElement("div");
    host.id = "samey-site-controls";
    host.className = "samey-site-controls";
    const home = document.documentElement.dataset.homeHref;
    if (home) host.insertAdjacentHTML("beforeend", `<a class="samey-icon" href="${home}" aria-label="Home" title="Home">${icon("home")}</a>`);

    // Keybr owns the preference state, but its practice toolbar should stay
    // uncluttered. Other pages expose the shared appearance control.
    if (document.documentElement.dataset.siteKind !== "keybr") {
      host.insertAdjacentHTML("beforeend", `<button class="samey-icon" type="button" aria-label="Appearance" title="Appearance" aria-expanded="false">${icon("appearance")}</button>`);
      const panel = document.createElement("div");
      panel.className = "samey-theme-panel";
      panel.hidden = true;
      panel.innerHTML = section("Theme", colorLabels, "data-theme-choice") + section("Font", fontLabels, "data-font-choice");
      host.append(panel);
      const trigger = host.querySelector('.samey-icon[type="button"]');
      trigger.addEventListener("click", () => {
        panel.hidden = !panel.hidden;
        trigger.setAttribute("aria-expanded", String(!panel.hidden));
      });
      panel.addEventListener("click", (event) => {
        const themeButton = event.target.closest("[data-theme-choice]");
        if (themeButton) setPrefs({ color: themeButton.dataset.themeChoice });
        const fontButton = event.target.closest("[data-font-choice]");
        if (fontButton) setPrefs({ font: fontButton.dataset.fontChoice });
      });
      document.addEventListener("pointerdown", (event) => {
        if (!host.contains(event.target)) {
          panel.hidden = true;
          trigger.setAttribute("aria-expanded", "false");
        }
      });
    }
    document.body.append(host);
    apply();
  };

  const css = document.createElement("style");
  css.textContent = `.samey-site-controls{position:fixed;top:10px;right:12px;z-index:10000;display:flex;gap:2px;align-items:center}.samey-icon{appearance:none;border:0;background:transparent;color:var(--site-fg,#121213);width:36px;height:36px;padding:8px;display:grid;place-items:center;cursor:pointer;border-radius:3px}.samey-icon:hover,.samey-icon:focus-visible{background:var(--site-soft,#eee);outline:none}.samey-icon svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.samey-theme-panel{position:absolute;right:0;top:42px;min-width:166px;padding:5px;background:var(--site-bg,#fff);color:var(--site-fg,#121213);border:1px solid var(--site-line,#ddd);box-shadow:0 .5rem 2rem #0002}.samey-theme-panel[hidden]{display:none}.samey-panel-title{padding:7px 9px 4px;color:var(--site-muted,#777);font:10px/1.2 var(--site-font,system-ui);text-transform:uppercase;letter-spacing:.08em}.samey-panel-title:not(:first-child){border-top:1px solid var(--site-line,#ddd);margin-top:4px;padding-top:10px}.samey-theme-panel button{width:100%;border:0;background:transparent;color:inherit;text-align:left;padding:7px 9px;font:12px/1.3 var(--site-font,system-ui);display:flex;justify-content:space-between;cursor:pointer}.samey-theme-panel button:hover,.samey-theme-panel button[data-selected],.samey-theme-panel button[data-font-choice][data-selected]{background:var(--site-soft,#eee)}.samey-theme-panel button[data-selected]::after{content:'•'}@media(max-width:520px){.samey-site-controls{top:8px;right:8px}}`;
  document.head.append(css);

  addEventListener("storage", (event) => { if (event.key === KEY) apply(); });
  matchMedia?.("(prefers-color-scheme: dark)").addEventListener?.("change", () => {
    const raw = rawPrefs();
    if (!raw.color || raw.color === "system") apply();
  });
  window.SameyTheme = { apply, read };
  apply();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mountControls, { once: true });
  else mountControls();
  if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register(new URL("sw.js", SCRIPT_ROOT).href).catch(() => {});
})();
