(() => {
  const KEY = "keybr.theme";
  const WORDLE_KEY = "ui-theme";
  const defaults = {
    light: { tone: "light", background: "#ffffff", text: "#121213", accent: "#787c7e", error: "#ff3333" },
    "clear-light": { tone: "light", background: "#faf9f8", text: "#202332", accent: "#355d82", error: "#c43d46" },
    dark: { tone: "dark", background: "#121213", text: "#f8f8f8", accent: "#a7a7a7", error: "#9b4545" },
    "clear-dark": { tone: "dark", background: "#303237", text: "#b0b4bd", accent: "#7c9fc4", error: "#e2848b" },
  };

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
  const read = () => {
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(KEY) || "null"); } catch {}
    let color = raw?.color;
    if (color === "system" || !["light", "clear-light", "dark", "clear-dark", "custom"].includes(color)) {
      color = matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    if (color !== "custom") return { color, ...defaults[color] };
    const c = raw?.custom || {};
    const fallback = c.tone === "dark" ? defaults.dark : defaults.light;
    return {
      color,
      tone: c.tone === "dark" ? "dark" : "light",
      background: validHex(c.background) ? c.background.toLowerCase() : fallback.background,
      text: validHex(c.text) ? c.text.toLowerCase() : fallback.text,
      accent: validHex(c.accent) ? c.accent.toLowerCase() : fallback.accent,
      error: validHex(c.error) ? c.error.toLowerCase() : fallback.error,
    };
  };
  const apply = () => {
    const t = read();
    const root = document.documentElement;
    root.dataset.siteTheme = t.color;
    root.dataset.kbTheme = t.tone;
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

    // Wordle's Tailwind theme reads these HSL channel variables.
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
    return t;
  };

  // Keep Wordle's own light/dark control useful by writing through to Keybr.
  const nativeSetItem = Storage.prototype.setItem;
  Storage.prototype.setItem = function (key, value) {
    nativeSetItem.call(this, key, value);
    if (this === localStorage && key === WORDLE_KEY && (value === "light" || value === "dark")) {
      try {
        const raw = JSON.parse(localStorage.getItem(KEY) || "{}") || {};
        if (raw.color !== value) nativeSetItem.call(localStorage, KEY, JSON.stringify({ ...raw, color: value }));
      } catch {
        nativeSetItem.call(localStorage, KEY, JSON.stringify({ color: value }));
      }
      queueMicrotask(apply);
    }
  };

  window.addEventListener("storage", (event) => { if (event.key === KEY) apply(); });
  window.SameyTheme = { apply, read };
  apply();
})();
