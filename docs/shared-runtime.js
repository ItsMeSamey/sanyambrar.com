(function() {
	//#endregion
	//#region src/shared/appearance.ts
	Object.defineProperty(globalThis, "SameyAppearanceConfig", {
		value: Object.freeze({
			colors: {
				"light": {
					"label": "Light",
					"tone": "light",
					"background": "#ffffff",
					"text": "#121213",
					"accent": "#2563eb",
					"error": "#dc2626",
					"warning": "#d4a72c",
					"slow": "#dc2626",
					"fast": "#16a34a",
					"effort": "#2563eb",
					"blurTint": "#000000",
					"shadowTint": "#000000"
				},
				"dark": {
					"label": "Dark",
					"tone": "dark",
					"background": "#121213",
					"text": "#f8f8f8",
					"accent": "#60a5fa",
					"error": "#f87171",
					"warning": "#facc15",
					"slow": "#ef4444",
					"fast": "#4ade80",
					"effort": "#60a5fa",
					"blurTint": "#000000",
					"shadowTint": "#000000"
				},
				"clear-dark": {
					"label": "Cool dark",
					"tone": "dark",
					"background": "#303237",
					"text": "#b0b4bd",
					"accent": "#7c9fc4",
					"error": "#e2848b",
					"warning": "#d9bd68",
					"slow": "#e2848b",
					"fast": "#69aa80",
					"effort": "#80a1c5",
					"blurTint": "#000000",
					"shadowTint": "#000000"
				},
				"deuteranopia": {
					"label": "Deuteranopia",
					"tone": "light",
					"background": "#ffffff",
					"text": "#121213",
					"accent": "#0072b2",
					"error": "#d55e00",
					"warning": "#e69f00",
					"slow": "#d55e00",
					"fast": "#009e73",
					"effort": "#cc79a7",
					"blurTint": "#000000",
					"shadowTint": "#000000"
				},
				"deuteranopia-dark": {
					"label": "Deuteranopia dark",
					"tone": "dark",
					"background": "#121213",
					"text": "#f8f8f8",
					"accent": "#56b4e9",
					"error": "#e69f00",
					"warning": "#f0e442",
					"slow": "#e69f00",
					"fast": "#6ccf9f",
					"effort": "#cc79a7",
					"blurTint": "#000000",
					"shadowTint": "#000000"
				},
				"deuteranopia-cool-dark": {
					"label": "Deuteranopia cool dark",
					"tone": "dark",
					"background": "#303237",
					"text": "#b0b4bd",
					"accent": "#6ea4cf",
					"error": "#d9a26c",
					"warning": "#c7b865",
					"slow": "#d9a26c",
					"fast": "#75aa94",
					"effort": "#b88aaf",
					"blurTint": "#000000",
					"shadowTint": "#000000"
				},
				"protanopia": {
					"label": "Protanopia",
					"tone": "light",
					"background": "#ffffff",
					"text": "#121213",
					"accent": "#3b6fb6",
					"error": "#d89000",
					"warning": "#8e6c9e",
					"slow": "#d89000",
					"fast": "#4e79a7",
					"effort": "#b07aa1",
					"blurTint": "#000000",
					"shadowTint": "#000000"
				},
				"protanopia-dark": {
					"label": "Protanopia dark",
					"tone": "dark",
					"background": "#121213",
					"text": "#f8f8f8",
					"accent": "#7aa6e8",
					"error": "#f0b447",
					"warning": "#b79bc4",
					"slow": "#f0b447",
					"fast": "#79a9d1",
					"effort": "#d394c5",
					"blurTint": "#000000",
					"shadowTint": "#000000"
				},
				"protanopia-cool-dark": {
					"label": "Protanopia cool dark",
					"tone": "dark",
					"background": "#303237",
					"text": "#b0b4bd",
					"accent": "#7897bd",
					"error": "#d0a058",
					"warning": "#9b88a4",
					"slow": "#d0a058",
					"fast": "#7398b1",
					"effort": "#b584ab",
					"blurTint": "#000000",
					"shadowTint": "#000000"
				},
				"tritanopia": {
					"label": "Tritanopia",
					"tone": "light",
					"background": "#ffffff",
					"text": "#121213",
					"accent": "#007c91",
					"error": "#c74646",
					"warning": "#a85ac7",
					"slow": "#c74646",
					"fast": "#168b76",
					"effort": "#8b5fbf",
					"blurTint": "#000000",
					"shadowTint": "#000000"
				},
				"tritanopia-dark": {
					"label": "Tritanopia dark",
					"tone": "dark",
					"background": "#121213",
					"text": "#f8f8f8",
					"accent": "#4fc3d0",
					"error": "#f08080",
					"warning": "#c084e0",
					"slow": "#f08080",
					"fast": "#5ec4aa",
					"effort": "#b49ae6",
					"blurTint": "#000000",
					"shadowTint": "#000000"
				},
				"tritanopia-cool-dark": {
					"label": "Tritanopia cool dark",
					"tone": "dark",
					"background": "#303237",
					"text": "#b0b4bd",
					"accent": "#6ba6ad",
					"error": "#c97b7b",
					"warning": "#a17bb3",
					"slow": "#c97b7b",
					"fast": "#6e9f91",
					"effort": "#9486b5",
					"blurTint": "#000000",
					"shadowTint": "#000000"
				}
			},
			fonts: {
				"monospace": {
					"label": "Monospace",
					"stack": "ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,\"Liberation Mono\",monospace"
				},
				"sans-serif": {
					"label": "Sans serif",
					"stack": "system-ui,-apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif"
				}
			}
		}),
		configurable: false,
		writable: false
	});
	//#endregion
	//#region src/shared/transitions.ts
	var reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
	var nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => resolve()));
	/** Every routed and local view deconstructs into rules, then rebuilds before content. */
	var CONSTRUCTED_TRANSITION = {
		out: 260,
		in: 420,
		line: 190,
		content: 150,
		groupGap: 90,
		stagger: 3,
		maxStagger: 70,
		offset: 5,
		enterEasing: "cubic-bezier(.16,1,.3,1)",
		leaveEasing: "cubic-bezier(.4,0,1,1)"
	};
	var CONSTRUCTION_LINE_SELECTOR = [
		"header",
		"nav",
		"main",
		"section",
		"article",
		"figure",
		"fieldset",
		"table",
		"thead",
		"tbody",
		"tr",
		"[role=\"dialog\"]",
		"[role=\"group\"]",
		"[role=\"radiogroup\"]",
		"button",
		"input",
		"select",
		"textarea",
		".site-topbar",
		".intro",
		".grid",
		".grid > *",
		".compact-list",
		".compact-row",
		".project-grid",
		".project",
		".home-tool-matrix",
		".home-tool",
		".home-writing-split",
		".home-writing-read",
		".home-writing-index",
		".home-writing-link",
		".fact-strip",
		".fact-strip > *",
		".detail-copy",
		".blog-split-index",
		".blog-index-nav",
		".blog-index-link",
		".blog-index-detail",
		".blog-detail-footer",
		".cnn-demo-shell",
		".cnn-controls-row",
		".cnn-output-pane",
		".wordle-mode-card",
		".stats-section",
		".stats-history-row",
		".active-game-card",
		".samey-dialog",
		".chain-mode-card",
		".chain-stats-grid > *",
		".chain-replay-stage",
		".chain-replay-controls",
		".chain-result",
		".game-settings-popover",
		".game-settings-actions",
		".keybr-segmented",
		".keybr-segmented-item"
	].join(",");
	var CONSTRUCTION_CONTENT_SELECTOR = [
		"h1",
		"h2",
		"h3",
		"p",
		"figcaption",
		"legend",
		"label",
		"dt",
		"dd",
		"li",
		"time",
		"output",
		"button",
		"a",
		"input",
		"select",
		"textarea",
		"canvas",
		"[role=\"status\"]",
		"[role=\"grid\"]",
		".site-topbar-start > *",
		".site-topbar-context > *",
		".site-topbar-nav > *",
		".intro-meta > *",
		".intro-links > *",
		".section-head > *",
		".card-top > *",
		".card-copy",
		".compact-row > *",
		".project-head > *",
		".project > p",
		".home-tool-index",
		".home-tool-top > *",
		".home-tool-desc",
		".home-writing-link > *",
		".home-writing-kicker",
		".home-writing-detail time",
		".home-writing-detail h2",
		".home-writing-dek",
		".home-writing-read",
		".home-writing-summary",
		".home-writing-detail li",
		".page-intro > *",
		".project-detail > .eyebrow",
		".project-detail > h1",
		".project-source-link",
		".fact-strip > *",
		".project-description > *",
		".blog-index-eyebrow",
		".blog-index-intro h1",
		".blog-index-intro p",
		".blog-index-link > *",
		".blog-detail-kicker",
		".blog-detail-date",
		".blog-index-detail h2",
		".blog-detail-dek",
		".blog-detail-summary",
		".blog-detail-points li",
		".blog-detail-footer > *",
		".chain-mode-eyebrow",
		".chain-mode-spec",
		".chain-turn",
		".chain-stats-grid > *",
		".chain-stat-row",
		".game-settings-section-title",
		".game-settings-slider-head",
		".keybr-segmented-item"
	].join(",");
	var stagger = (index) => Math.min(index * CONSTRUCTED_TRANSITION.stagger, CONSTRUCTED_TRANSITION.maxStagger);
	var animationFinished = (animation) => animation.finished.catch(() => void 0);
	var waitAnimations = (animations) => Promise.all(animations.map(animationFinished));
	function inViewport(rect) {
		return rect.width > 0 && rect.height > 0 && rect.right > -2 && rect.bottom > -2 && rect.left < innerWidth + 2 && rect.top < innerHeight + 2;
	}
	function opaqueBorder(color, width) {
		if (!(parseFloat(width) > 0) || color === "transparent") return false;
		return !/^rgba\([^)]*,\s*0(?:\.0+)?\s*\)$/.test(color);
	}
	function makeConstructionLayer(root) {
		const layer = document.createElement("div");
		layer.className = "samey-construction-layer";
		layer.setAttribute("aria-hidden", "true");
		layer.inert = true;
		const seen = /* @__PURE__ */ new Set();
		const candidates = [root, ...root.querySelectorAll(CONSTRUCTION_LINE_SELECTOR)];
		const add = (axis, x, y, size, thickness, color) => {
			const key = `${axis}:${Math.round((axis === "x" ? x : y) * 2)}:${Math.round((axis === "x" ? y : x) * 2)}:${Math.round(size * 2)}:${color}`;
			if (size < 2 || seen.has(key)) return;
			seen.add(key);
			const line = document.createElement("i");
			line.className = "samey-construction-line";
			line.dataset.axis = axis;
			line.style.left = `${x}px`;
			line.style.top = `${y}px`;
			line.style.width = axis === "x" ? `${size}px` : `${Math.max(1, thickness)}px`;
			line.style.height = axis === "y" ? `${size}px` : `${Math.max(1, thickness)}px`;
			line.style.backgroundColor = color;
			layer.append(line);
		};
		for (const element of candidates) {
			const rect = element.getBoundingClientRect();
			if (!inViewport(rect)) continue;
			const style = getComputedStyle(element);
			const left = Math.max(0, rect.left);
			const right = Math.min(innerWidth, rect.right);
			const top = Math.max(0, rect.top);
			const bottom = Math.min(innerHeight, rect.bottom);
			if (opaqueBorder(style.borderTopColor, style.borderTopWidth) && rect.top >= 0 && rect.top <= innerHeight) add("x", left, rect.top, right - left, parseFloat(style.borderTopWidth), style.borderTopColor);
			if (opaqueBorder(style.borderBottomColor, style.borderBottomWidth) && rect.bottom >= 0 && rect.bottom <= innerHeight) add("x", left, rect.bottom - parseFloat(style.borderBottomWidth), right - left, parseFloat(style.borderBottomWidth), style.borderBottomColor);
			if (opaqueBorder(style.borderLeftColor, style.borderLeftWidth) && rect.left >= 0 && rect.left <= innerWidth) add("y", rect.left, top, bottom - top, parseFloat(style.borderLeftWidth), style.borderLeftColor);
			if (opaqueBorder(style.borderRightColor, style.borderRightWidth) && rect.right >= 0 && rect.right <= innerWidth) add("y", rect.right - parseFloat(style.borderRightWidth), top, bottom - top, parseFloat(style.borderRightWidth), style.borderRightColor);
		}
		document.body.append(layer);
		return layer;
	}
	function animateConstructionLines(layer, phase, direction) {
		return [...layer.children].map((child, index) => {
			const line = child;
			const horizontal = line.dataset.axis === "x";
			const entering = phase === "in";
			const forward = direction === "forward";
			line.style.transformOrigin = horizontal ? entering === forward ? "left center" : "right center" : entering === forward ? "center top" : "center bottom";
			const hidden = horizontal ? "scaleX(0)" : "scaleY(0)";
			return line.animate(entering ? [{ transform: hidden }, { transform: "scale(1)" }] : [{ transform: "scale(1)" }, { transform: hidden }], {
				duration: CONSTRUCTED_TRANSITION.line,
				delay: stagger(index),
				easing: entering ? CONSTRUCTED_TRANSITION.enterEasing : CONSTRUCTED_TRANSITION.leaveEasing,
				fill: "both"
			});
		});
	}
	function contentTargets(root) {
		const candidates = [...root.querySelectorAll(CONSTRUCTION_CONTENT_SELECTOR)].filter((element) => inViewport(element.getBoundingClientRect()));
		const selected = new Set(candidates);
		return candidates.filter((element) => {
			const interactiveAncestor = element.parentElement?.closest("button,a");
			return interactiveAncestor == null || !selected.has(interactiveAncestor);
		});
	}
	function animateConstructionContent(root, phase, direction) {
		const entering = phase === "in";
		const sign = direction === "forward" ? 1 : -1;
		return contentTargets(root).map((element, index) => {
			const baseTransform = getComputedStyle(element).transform;
			const baseline = baseTransform === "none" ? "none" : baseTransform;
			const shifted = `${baseTransform === "none" ? "" : `${baseTransform} `}translate3d(0,${(entering ? sign : -sign) * CONSTRUCTED_TRANSITION.offset}px,0)`;
			return element.animate(entering ? [{
				opacity: 0,
				transform: shifted
			}, {
				opacity: 1,
				transform: baseline
			}] : [{
				opacity: 1,
				transform: baseline
			}, {
				opacity: 0,
				transform: shifted
			}], {
				duration: CONSTRUCTED_TRANSITION.content,
				delay: (entering ? CONSTRUCTED_TRANSITION.groupGap : 0) + stagger(index),
				easing: entering ? CONSTRUCTED_TRANSITION.enterEasing : CONSTRUCTED_TRANSITION.leaveEasing,
				fill: "both"
			});
		});
	}
	async function animateConstructionExit(root, direction) {
		const layer = makeConstructionLayer(root);
		const animations = [
			root.animate([{ opacity: 1 }, { opacity: 0 }], {
				duration: CONSTRUCTED_TRANSITION.out,
				easing: CONSTRUCTED_TRANSITION.leaveEasing,
				fill: "both"
			}),
			...animateConstructionLines(layer, "out", direction),
			...animateConstructionContent(root, "out", direction)
		];
		await waitAnimations(animations);
		return {
			layer,
			animations
		};
	}
	async function animateConstructionEntrance(root, direction) {
		const priorOpacity = root.style.opacity;
		root.style.opacity = "0";
		const layer = makeConstructionLayer(root);
		const animations = [
			root.animate([{ opacity: 0 }, { opacity: 1 }], {
				duration: CONSTRUCTED_TRANSITION.in,
				easing: CONSTRUCTED_TRANSITION.enterEasing,
				fill: "both"
			}),
			...animateConstructionLines(layer, "in", direction),
			...animateConstructionContent(root, "in", direction)
		];
		root.style.opacity = priorOpacity;
		await waitAnimations(animations);
		for (const animation of animations) animation.cancel();
		layer.remove();
	}
	async function resolveIncoming(next, current) {
		await Promise.resolve();
		let incoming = next();
		if (!incoming || incoming === current || !incoming.isConnected) {
			await nextFrame();
			incoming = next();
		}
		return incoming;
	}
	function cleanupConstruction(run) {
		run.layer.remove();
		for (const animation of run.animations) animation.cancel();
	}
	async function animateRootSwap(current, commit, next, direction = "forward") {
		if (!current || reducedMotion() || !current.animate) {
			await commit();
			return;
		}
		const outgoing = await animateConstructionExit(current, direction);
		try {
			await commit();
		} catch (error) {
			cleanupConstruction(outgoing);
			throw error;
		}
		cleanupConstruction(outgoing);
		const incoming = await resolveIncoming(next, current);
		if (incoming?.isConnected) await animateConstructionEntrance(incoming, direction);
	}
	//#endregion
	//#region src/shared/contrast.ts
	var linear = (value) => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
	function contrastTextRgb(r, g, b) {
		const luminance = .2126 * linear(r) + .7152 * linear(g) + .0722 * linear(b);
		return 1.05 / (luminance + .05) >= (luminance + .05) / .05 ? "#ffffff" : "#000000";
	}
	function contrastText(hex) {
		return contrastTextRgb(...[
			1,
			3,
			5
		].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255));
	}
	//#endregion
	//#region src/shared/loadingSvg.ts
	var loadingGeometry = Object.freeze({
		size: 64,
		cx: 32,
		cy: 32,
		baseRadius: 8.4,
		amplitude: 1.35,
		waves: 6,
		duration: .72,
		zeroCrossingPower: .72,
		points: 96,
		frames: 25
	});
	var framesCache;
	function generateLoadingFrames() {
		if (framesCache) return framesCache;
		const { cx, cy, baseRadius, amplitude, waves, zeroCrossingPower, points, frames } = loadingGeometry;
		framesCache = Array.from({ length: frames }, (_, frame) => {
			const progress = frame / (frames - 1);
			const raw = Math.cos(progress * Math.PI * 2);
			const multiplier = Math.sign(raw) * Math.pow(Math.abs(raw), zeroCrossingPower);
			let d = "";
			for (let i = 0; i <= points; i++) {
				const angle = i / points * Math.PI * 2;
				const radius = baseRadius + amplitude * multiplier * Math.sin(waves * angle);
				const x = cx + radius * Math.cos(angle);
				const y = cy + radius * Math.sin(angle);
				d += `${i ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)}`;
			}
			return d + "Z";
		});
		return framesCache;
	}
	function generateAnimatedSineCircleSvg() {
		const paths = generateLoadingFrames();
		const keyTimes = paths.map((_, i) => (i / (paths.length - 1)).toFixed(6)).join(";");
		return `<svg class="samey-cursor-loading" xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" aria-hidden="true"><path fill="currentColor" d="${paths[0]}"><animate attributeName="d" dur="${loadingGeometry.duration}s" repeatCount="indefinite" calcMode="linear" keyTimes="${keyTimes}" values="${paths.join(";")}"/></path></svg>`;
	}
	//#endregion
	//#region src/shared/theme.ts
	var isRecord = (value) => value != null && typeof value === "object" && !Array.isArray(value);
	var asRecord = (value) => isRecord(value) ? value : {};
	var eventElement = (event) => event.target instanceof Element ? event.target : null;
	(() => {
		const currentScript = document.currentScript;
		const SCRIPT_URL = new URL(currentScript instanceof HTMLScriptElement ? currentScript.src : location.href);
		const SCRIPT_ROOT = new URL(".", SCRIPT_URL);
		const BUILD_VERSION = SCRIPT_URL.searchParams.get("v") || "";
		const KEY = "keybr.theme";
		const FONT_KEY = "samey.font";
		const CURSOR_MODES = [
			"invert",
			"hardware",
			"native"
		];
		const CURSOR_LABELS = Object.freeze({
			invert: "Invert",
			hardware: "Hardware",
			native: "Native"
		});
		const isCursorMode = (value) => value === "invert" || value === "hardware" || value === "native";
		const normalizeCursorMode = (value) => isCursorMode(value) ? value : "hardware";
		const config = globalThis.SameyAppearanceConfig;
		if (config == null) throw new Error("Shared appearance config is not loaded");
		const validHex = (value) => typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
		const mix = (a, b, weight) => {
			const rgb = (value) => [
				parseInt(value.slice(1, 3), 16),
				parseInt(value.slice(3, 5), 16),
				parseInt(value.slice(5, 7), 16)
			];
			const aa = rgb(a), bb = rgb(b);
			return "#" + aa.map((value, i) => Math.round(value * (1 - weight) + bb[i] * weight).toString(16).padStart(2, "0")).join("");
		};
		const hsl = (hex) => {
			let [r, g, b] = [
				1,
				3,
				5
			].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
			const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
			if (max === min) return `0 0% ${+(l * 100).toFixed(2)}%`;
			const d = max - min;
			const s = l > .5 ? d / (2 - max - min) : d / (max + min);
			return `${+((max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4) / 6 * 360).toFixed(2)} ${+(s * 100).toFixed(2)}% ${+(l * 100).toFixed(2)}%`;
		};
		const HTML_ESCAPES = {
			"&": "&amp;",
			"<": "&lt;",
			">": "&gt;",
			"\"": "&quot;",
			"'": "&#39;"
		};
		const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (c) => HTML_ESCAPES[c] ?? c);
		const cursorDataUrl = (svg, hotspotX = 32, hotspotY = 32) => `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${hotspotX} ${hotspotY}`;
		const hardwareLoadingPath = generateLoadingFrames()[0];
		const hardwareCursorSvgs = (theme) => {
			const fg = theme.text;
			const bg = theme.background;
			const shell = (body, width, height, viewBox) => `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${viewBox}">${body}</svg>`;
			return {
				dot: shell(`<circle cx="32" cy="32" r="9.4" fill="${bg}"/><circle cx="32" cy="32" r="8.4" fill="${fg}"/>`, 20, 20, "22 22 20 20"),
				text: shell(`<rect x="30" y="20" width="4" height="24" rx="2" fill="${bg}"/><rect x="31" y="21" width="2" height="22" rx="1" fill="${fg}"/>`, 4, 24, "30 20 4 24"),
				grab: shell(`<defs><mask id="b" maskUnits="userSpaceOnUse" style="mask-type:luminance"><circle cx="32" cy="32" r="9.4" fill="white"/><rect x="31.2" y="23.4" width="1.6" height="17.2" fill="black"/><rect x="23.4" y="31.2" width="17.2" height="1.6" fill="black"/></mask><mask id="f" maskUnits="userSpaceOnUse" style="mask-type:luminance"><circle cx="32" cy="32" r="8.4" fill="white"/><rect x="30.2" y="22.4" width="3.6" height="19.2" fill="black"/><rect x="22.4" y="30.2" width="19.2" height="3.6" fill="black"/></mask></defs><circle cx="32" cy="32" r="9.4" fill="${bg}" mask="url(#b)"/><circle cx="32" cy="32" r="8.4" fill="${fg}" mask="url(#f)"/><circle cx="32" cy="32" r="5.8" fill="${bg}"/><circle cx="32" cy="32" r="4.8" fill="${fg}"/>`, 20, 20, "22 22 20 20"),
				loading: shell(`<path d="${hardwareLoadingPath}" fill="${fg}" stroke="${bg}" stroke-width="2" stroke-linejoin="round" paint-order="stroke fill"/>`, 22, 22, "21 21 22 22")
			};
		};
		const hardwareCursorCache = /* @__PURE__ */ new Map();
		const CURSOR_SUPERSAMPLE = 4;
		const hardwareCursorPngs = (theme) => {
			const cacheKey = `${theme.text}|${theme.background}`;
			const cached = hardwareCursorCache.get(cacheKey);
			if (cached) return cached;
			const make = (width, height, hotspotX, hotspotY, draw) => {
				try {
					const source = document.createElement("canvas");
					source.width = width * CURSOR_SUPERSAMPLE;
					source.height = height * CURSOR_SUPERSAMPLE;
					const sourceCtx = source.getContext("2d");
					if (!sourceCtx) return null;
					sourceCtx.scale(CURSOR_SUPERSAMPLE, CURSOR_SUPERSAMPLE);
					if (draw(sourceCtx, width, height) === false) return null;
					const canvas = document.createElement("canvas");
					canvas.width = width;
					canvas.height = height;
					const ctx = canvas.getContext("2d", { willReadFrequently: true });
					if (!ctx) return null;
					ctx.imageSmoothingEnabled = true;
					ctx.imageSmoothingQuality = "high";
					ctx.drawImage(source, 0, 0, width, height);
					const pixels = ctx.getImageData(0, 0, width, height).data;
					let minX = width, minY = height, maxX = -1, maxY = -1;
					for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
						if (!pixels[(y * width + x) * 4 + 3]) continue;
						if (x < minX) minX = x;
						if (x > maxX) maxX = x;
						if (y < minY) minY = y;
						if (y > maxY) maxY = y;
					}
					if (maxX < minX || maxY < minY) return null;
					const croppedWidth = maxX - minX + 1, croppedHeight = maxY - minY + 1;
					const cropped = document.createElement("canvas");
					cropped.width = croppedWidth;
					cropped.height = croppedHeight;
					const croppedCtx = cropped.getContext("2d");
					if (!croppedCtx) return null;
					croppedCtx.drawImage(canvas, -minX, -minY);
					return {
						url: `url("${cropped.toDataURL("image/png")}")`,
						x: Math.max(0, Math.min(croppedWidth - 1, hotspotX - minX)),
						y: Math.max(0, Math.min(croppedHeight - 1, hotspotY - minY)),
						width: croppedWidth,
						height: croppedHeight
					};
				} catch {
					return null;
				}
			};
			const circle = (ctx, x, y, r, fill) => {
				ctx.beginPath();
				ctx.arc(x, y, r, 0, Math.PI * 2);
				ctx.fillStyle = fill;
				ctx.fill();
			};
			const capsule = (ctx, x, y, width, height, fill) => {
				const r = width / 2, cx = x + r;
				ctx.fillStyle = fill;
				ctx.fillRect(x, y + r, width, Math.max(0, height - width));
				circle(ctx, cx, y + r, r, fill);
				circle(ctx, cx, y + height - r, r, fill);
			};
			const maskedCircle = (ctx, size, radius, fill, cutWidth, cutLength) => {
				const layer = document.createElement("canvas");
				layer.width = layer.height = size * CURSOR_SUPERSAMPLE;
				const lctx = layer.getContext("2d");
				if (!lctx) return;
				lctx.scale(CURSOR_SUPERSAMPLE, CURSOR_SUPERSAMPLE);
				const c = size / 2;
				circle(lctx, c, c, radius, fill);
				lctx.globalCompositeOperation = "destination-out";
				lctx.fillRect(c - cutWidth / 2, c - cutLength / 2, cutWidth, cutLength);
				lctx.fillRect(c - cutLength / 2, c - cutWidth / 2, cutLength, cutWidth);
				ctx.drawImage(layer, 0, 0, size, size);
			};
			const fg = theme.text, bg = theme.background;
			const out = {
				dot: make(20, 20, 10, 10, (ctx) => {
					circle(ctx, 10, 10, 9.4, bg);
					circle(ctx, 10, 10, 8.4, fg);
				}),
				text: make(4, 24, 2, 12, (ctx) => {
					capsule(ctx, 0, 0, 4, 24, bg);
					capsule(ctx, 1, 1, 2, 22, fg);
				}),
				grab: make(20, 20, 10, 10, (ctx) => {
					maskedCircle(ctx, 20, 9.4, bg, 1.6, 17.2);
					maskedCircle(ctx, 20, 8.4, fg, 3.6, 19.2);
					circle(ctx, 10, 10, 5.8, bg);
					circle(ctx, 10, 10, 4.8, fg);
				}),
				loading: make(22, 22, 11, 11, (ctx) => {
					if (typeof Path2D !== "function") return false;
					ctx.save();
					ctx.translate(-21, -21);
					const path = new Path2D(hardwareLoadingPath);
					ctx.lineJoin = "round";
					ctx.lineWidth = 2;
					ctx.strokeStyle = bg;
					ctx.stroke(path);
					ctx.fillStyle = fg;
					ctx.fill(path);
					ctx.restore();
				})
			};
			hardwareCursorCache.set(cacheKey, out);
			return out;
		};
		const applyHardwareCursorTheme = (root, theme) => {
			const svgs = hardwareCursorSvgs(theme);
			const pngs = hardwareCursorPngs(theme);
			const chain = (png, svg, x, y) => [png && `${png.url} ${png.x} ${png.y}`, cursorDataUrl(svg, x, y)].filter(Boolean).join(",");
			root.style.setProperty("--samey-hw-dot", chain(pngs.dot, svgs.dot, 10, 10));
			root.style.setProperty("--samey-hw-text", chain(pngs.text, svgs.text, 2, 12));
			root.style.setProperty("--samey-hw-grab", chain(pngs.grab, svgs.grab, 10, 10));
			root.style.setProperty("--samey-hw-loading", chain(pngs.loading, svgs.loading, 11, 11));
		};
		const semanticRoles = [
			"accent",
			"error",
			"warning",
			"slow",
			"fast",
			"effort"
		];
		const defaultBgWeight = (tone) => tone === "dark" ? .29 : .17;
		const normalizeTheme = (value, fallback) => {
			const source = asRecord(value), base = asRecord(fallback);
			const tone = source.tone === "dark" ? "dark" : "light";
			const background = validHex(source.background) ? source.background.toLowerCase() : validHex(base.background) ? base.background.toLowerCase() : "#ffffff";
			const text = validHex(source.text) ? source.text.toLowerCase() : validHex(base.text) ? base.text.toLowerCase() : "#121213";
			const out = {
				tone,
				background,
				text,
				blurTint: validHex(source.blurTint) ? source.blurTint.toLowerCase() : validHex(base.blurTint) ? base.blurTint.toLowerCase() : "#000000",
				shadowTint: validHex(source.shadowTint) ? source.shadowTint.toLowerCase() : validHex(base.shadowTint) ? base.shadowTint.toLowerCase() : "#000000"
			};
			for (const role of semanticRoles) {
				const fgKey = `${role}Fg`, bgKey = `${role}Bg`;
				const fgValue = source[fgKey] ?? source[role];
				const fallbackFg = base[fgKey] ?? base[role] ?? text;
				const fg = validHex(fgValue) ? fgValue.toLowerCase() : validHex(fallbackFg) ? fallbackFg.toLowerCase() : text;
				const bgValue = source[bgKey];
				const fallbackBg = base[bgKey];
				const bg = validHex(bgValue) ? bgValue.toLowerCase() : validHex(fallbackBg) ? fallbackBg.toLowerCase() : mix(background, fg, defaultBgWeight(tone));
				out[role] = fg;
				out[fgKey] = fg;
				out[bgKey] = bg;
			}
			const selectionFg = source.selectionFg;
			const selectionBg = source.selectionBg;
			out.selectionFg = validHex(selectionFg) ? selectionFg.toLowerCase() : text;
			out.selectionBg = validHex(selectionBg) ? selectionBg.toLowerCase() : mix(background, out.accentFg ?? text, tone === "dark" ? .42 : .27);
			return out;
		};
		const rawColors = config.colors;
		const colors = {};
		for (const [id, value] of Object.entries(rawColors)) colors[id] = normalizeTheme(value, value);
		const COLOR_IDS = Object.keys(colors);
		const FONT_IDS = Object.keys(config.fonts);
		const fontLabels = Object.fromEntries(Object.entries(config.fonts).map(([id, value]) => [id, value.label]));
		const fontStacks = Object.fromEntries(Object.entries(config.fonts).map(([id, value]) => [id, value.stack]));
		const DEFAULT_THEME_MENU = [
			"system",
			"light",
			"dark",
			"clear-dark"
		];
		const COLORBLIND_PROFILES = Object.freeze([
			["deuteranopia", "Deuteranopia"],
			["protanopia", "Protanopia"],
			["tritanopia", "Tritanopia"]
		]);
		const COLORBLIND_VARIANTS = Object.freeze([
			[
				"light",
				"Light",
				""
			],
			[
				"dark",
				"Dark",
				"-dark"
			],
			[
				"cool-dark",
				"Cool dark",
				"-cool-dark"
			]
		]);
		const COLORBLIND_PRESET_IDS = Object.freeze(COLORBLIND_PROFILES.flatMap(([profile]) => COLORBLIND_VARIANTS.map(([, , suffix]) => `${profile}${suffix}`)));
		const isColorblindPresetId = (id) => COLORBLIND_PRESET_IDS.includes(id);
		const colorblindPresetId = (profile, variant) => {
			return `${profile}${COLORBLIND_VARIANTS.find(([id]) => id === variant)?.[2] ?? ""}`;
		};
		let volatileThemePrefs = {};
		let volatileFont;
		const rawPrefs = () => {
			let stored = {};
			try {
				stored = asRecord(JSON.parse(localStorage.getItem(KEY) || "null"));
			} catch {}
			return {
				...stored,
				...volatileThemePrefs
			};
		};
		const defaultFont = () => document.documentElement.dataset.siteKind === "keybr" ? "monospace" : "sans-serif";
		const readFont = () => {
			if (volatileFont && FONT_IDS.includes(volatileFont)) return volatileFont;
			try {
				const value = localStorage.getItem(FONT_KEY);
				if (value && FONT_IDS.includes(value)) return value;
			} catch {}
			const legacy = rawPrefs().font;
			return typeof legacy === "string" && FONT_IDS.includes(legacy) ? legacy : defaultFont();
		};
		const isRawSavedTheme = (item) => isRecord(item) && typeof item.id === "string" && typeof item.name === "string";
		const normalizedSavedThemes = (raw = rawPrefs()) => Array.isArray(raw.savedThemes) ? raw.savedThemes.filter(isRawSavedTheme).map((item) => ({
			...normalizeTheme(item, colors.light),
			id: item.id,
			name: item.name.slice(0, 80)
		})) : [];
		const savedThemeId = (id) => `saved:${id}`;
		const migrateColor = (value, savedThemes) => {
			if (value === "light-contrast" || value === "clear-light") return "light";
			if (value === "dark-contrast" || value === "chocolate") return value === "chocolate" ? "dark" : "clear-dark";
			if (typeof value === "string" && [
				"gray",
				"yellow",
				"garden",
				"coffee",
				"honey"
			].includes(value)) return "light";
			if (typeof value === "string" && value.startsWith("saved:")) return savedThemes.some((theme) => savedThemeId(theme.id) === value) ? value : "system";
			return typeof value === "string" && (value === "system" || value === "custom" || COLOR_IDS.includes(value)) ? value : "system";
		};
		const read = () => {
			const raw = rawPrefs();
			const savedThemes = normalizedSavedThemes(raw);
			const selected = migrateColor(raw.color, savedThemes);
			const font = readFont();
			const cursorMode = normalizeCursorMode(raw.cursorMode);
			if (selected === "system") {
				const color = matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
				return {
					color,
					selected: "system",
					font,
					cursorMode,
					...colors[color],
					custom: { ...colors[color] }
				};
			}
			if (selected === "custom") {
				const custom = asRecord(raw.custom);
				const fallback = custom.tone === "dark" ? colors.dark : colors.light;
				const theme = normalizeTheme(custom, fallback);
				return {
					color: "custom",
					selected: "custom",
					font,
					cursorMode,
					...theme,
					custom: { ...theme }
				};
			}
			if (selected.startsWith("saved:")) {
				const saved = savedThemes.find((theme) => savedThemeId(theme.id) === selected) || savedThemes[0];
				const theme = normalizeTheme(saved, saved?.tone === "dark" ? colors.dark : colors.light);
				return {
					color: selected,
					selected,
					font,
					cursorMode,
					...theme,
					custom: { ...theme },
					savedName: saved?.name || "Saved theme"
				};
			}
			const theme = colors[selected] || colors.light;
			return {
				color: selected,
				selected,
				font,
				cursorMode,
				...theme,
				custom: { ...theme }
			};
		};
		const keybrCustomProperties = (theme) => {
			const dark = theme.tone === "dark";
			const primary = theme.background, secondary = theme.text;
			const accent = theme.accentFg, error = theme.errorFg;
			return {
				"--primary-d2": mix(primary, dark ? "#ffffff" : "#000000", .1),
				"--primary-d1": mix(primary, dark ? "#ffffff" : "#000000", .05),
				"--primary": primary,
				"--primary-l1": mix(primary, dark ? "#000000" : "#ffffff", dark ? .02 : .03),
				"--primary-l2": mix(primary, dark ? "#000000" : "#ffffff", dark ? .03 : .05),
				"--secondary-d1": mix(secondary, dark ? "#ffffff" : "#000000", .1),
				"--secondary": secondary,
				"--secondary-l1": mix(secondary, dark ? "#000000" : "#ffffff", .1),
				"--secondary-l2": mix(secondary, dark ? "#000000" : "#ffffff", .2),
				"--secondary-f1": mix(secondary, primary, .2),
				"--secondary-f2": mix(secondary, primary, .4),
				"--accent-d2": mix(accent, "#000000", dark ? .1 : .2),
				"--accent-d1": mix(accent, "#000000", dark ? .05 : .1),
				"--accent": accent,
				"--accent-l1": mix(accent, "#ffffff", dark ? .05 : .1),
				"--accent-l2": mix(accent, "#ffffff", dark ? .1 : .2),
				"--error-d1": mix(error, dark ? "#ffffff" : "#000000", .1),
				"--error": error,
				"--error-l1": mix(error, dark ? "#000000" : "#ffffff", .1),
				"--shadow-color": `color-mix(in srgb,${theme.shadowTint} ${dark ? 53 : 27}%,transparent)`,
				"--Spotlight__background-color": `color-mix(in srgb,${theme.blurTint} 6%,transparent)`,
				"--slow-key-color": theme.slowFg,
				"--fast-key-color": theme.fastFg,
				"--effort-color": theme.effortFg,
				"--textinput__color": secondary,
				"--textinput--special__color": mix(secondary, primary, .5),
				"--textinput--hit__color": mix(secondary, primary, .4),
				"--textinput--miss__color": error,
				"--Name-color": mix(secondary, primary, .2),
				"--Value-color": mix(secondary, primary, .1),
				"--Value--more__color": theme.fastFg,
				"--Value--less__color": theme.slowFg,
				"--Chart-speed__color": theme.fastFg,
				"--Chart-accuracy__color": theme.errorFg,
				"--Chart-complexity__color": theme.effortFg,
				"--Chart-threshold__color": theme.accentFg,
				"--Chart-hist-h__color": theme.effortFg,
				"--Chart-hist-m__color": theme.errorFg,
				"--Chart-hist-r__color": mix(theme.errorFg, theme.effortFg, .5),
				"--KeyboardKey-pointer__color": theme.text,
				"--KeyboardKey-symbol--dead__color": theme.errorFg,
				"--KeyboardKey-symbol--ligature__color": theme.effortFg,
				"--pinky-zone-color": theme.fastBg,
				"--ring-zone-color": theme.warningBg,
				"--middle-zone-color": theme.warningBg,
				"--left-index-zone-color": theme.accentBg,
				"--right-index-zone-color": theme.effortBg,
				"--thumb-zone-color": theme.errorBg,
				"--syntax-keyword": theme.accentFg,
				"--syntax-string": theme.fastFg,
				"--syntax-number": theme.effortFg,
				"--syntax-comment": mix(secondary, primary, .42)
			};
		};
		const KEYBR_CUSTOM_PROPERTIES = Object.keys(keybrCustomProperties(colors.light));
		const nativeSetItem = Storage.prototype.setItem;
		let notifying = false;
		const notify = (theme) => {
			if (notifying) return;
			notifying = true;
			dispatchEvent(new CustomEvent("samey-themechange", { detail: theme }));
			notifying = false;
		};
		let appearancePanel = null;
		let appearanceTrigger = null;
		let advancedPage = null;
		let advancedEditor = null;
		const apply = () => {
			const theme = read();
			const root = document.documentElement;
			root.dataset.siteTheme = theme.color;
			root.dataset.kbTheme = theme.tone;
			root.dataset.font = theme.font;
			root.dataset.color = theme.color;
			root.classList.toggle("dark", theme.tone === "dark");
			root.style.colorScheme = theme.tone;
			root.dataset.cursorMode = theme.cursorMode;
			root.classList.toggle("samey-custom-cursor", theme.cursorMode === "invert");
			root.classList.toggle("samey-hardware-cursor", theme.cursorMode === "hardware");
			root.classList.toggle("samey-native-cursor", theme.cursorMode === "native");
			applyHardwareCursorTheme(root, theme);
			const line = mix(theme.text, theme.background, theme.tone === "dark" ? .72 : .82);
			const soft = mix(theme.text, theme.background, theme.tone === "dark" ? .9 : .96);
			root.style.setProperty("--site-bg", theme.background);
			root.style.setProperty("--site-fg", theme.text);
			root.style.setProperty("--site-muted", mix(theme.text, theme.background, .42));
			root.style.setProperty("--site-line", line);
			root.style.setProperty("--site-soft", soft);
			root.style.setProperty("--site-blur-tint", theme.blurTint);
			root.style.setProperty("--site-shadow-tint", theme.shadowTint);
			root.style.setProperty("--site-on-fg", contrastText(theme.text));
			root.style.setProperty("--site-on-bg", contrastText(theme.background));
			for (const role of semanticRoles) {
				const fg = theme[`${role}Fg`];
				const bg = theme[`${role}Bg`];
				root.style.setProperty(`--site-${role}-fg`, fg);
				root.style.setProperty(`--site-${role}-bg`, bg);
				root.style.setProperty(`--site-${role}-on-fg`, contrastText(fg));
				root.style.setProperty(`--site-${role}-on-bg`, contrastText(bg));
			}
			root.style.setProperty("--site-accent", theme.accentFg);
			root.style.setProperty("--site-error", theme.errorFg);
			root.style.setProperty("--site-warning-color", theme.warningFg);
			root.style.setProperty("--site-slow-color", theme.slowFg);
			root.style.setProperty("--site-fast-color", theme.fastFg);
			root.style.setProperty("--site-effort-color", theme.effortFg);
			root.style.setProperty("--site-font", fontStacks[theme.font]);
			if (root.dataset.siteKind === "wordle") {
				root.style.removeProperty("--site-selection");
				root.style.removeProperty("--site-selection-bg");
				root.style.removeProperty("--site-selection-fg");
			} else {
				root.style.setProperty("--site-selection", theme.selectionBg);
				root.style.setProperty("--site-selection-bg", theme.selectionBg);
				root.style.setProperty("--site-selection-fg", theme.selectionFg);
			}
			if (root.dataset.siteKind === "keybr") {
				for (const name of KEYBR_CUSTOM_PROPERTIES) root.style.removeProperty(name);
				for (const [name, value] of Object.entries(keybrCustomProperties(theme))) root.style.setProperty(name, value);
			}
			if (root.dataset.siteKind === "wordle") {
				const infoBg = mix(theme.background, theme.effortFg, .18);
				const successBg = mix(theme.background, theme.fastFg, .18);
				const warningBg = mix(theme.background, theme.warningFg, .18);
				const errorBg = mix(theme.background, theme.errorFg, .16);
				const stateErrorBg = mix(theme.background, theme.errorFg, .68);
				const stateWarningBg = mix(theme.background, theme.warningFg, .76);
				const stateFastBg = mix(theme.background, theme.fastFg, .76);
				const stateEffortBg = mix(theme.background, theme.effortFg, .7);
				root.style.setProperty("--background", hsl(theme.background));
				root.style.setProperty("--foreground", hsl(theme.text));
				root.style.setProperty("--card", hsl(theme.background));
				root.style.setProperty("--card-foreground", hsl(theme.text));
				root.style.setProperty("--popover", hsl(theme.background));
				root.style.setProperty("--popover-foreground", hsl(theme.text));
				root.style.setProperty("--primary", hsl(theme.text));
				root.style.setProperty("--primary-foreground", hsl(contrastText(theme.text)));
				root.style.setProperty("--secondary", hsl(soft));
				root.style.setProperty("--secondary-foreground", hsl(theme.text));
				root.style.setProperty("--muted", hsl(soft));
				root.style.setProperty("--muted-foreground", hsl(mix(theme.text, theme.background, .42)));
				root.style.setProperty("--accent", hsl(soft));
				root.style.setProperty("--accent-foreground", hsl(theme.text));
				root.style.setProperty("--border", hsl(line));
				root.style.setProperty("--input", hsl(line));
				root.style.setProperty("--ring", hsl(theme.accentFg));
				root.style.setProperty("--info", hsl(infoBg));
				root.style.setProperty("--info-foreground", hsl(theme.effortFg));
				root.style.setProperty("--info-on-bg", hsl(contrastText(infoBg)));
				root.style.setProperty("--success", hsl(successBg));
				root.style.setProperty("--success-foreground", hsl(theme.fastFg));
				root.style.setProperty("--success-on-bg", hsl(contrastText(successBg)));
				root.style.setProperty("--warning", hsl(warningBg));
				root.style.setProperty("--warning-foreground", hsl(theme.warningFg));
				root.style.setProperty("--warning-on-bg", hsl(contrastText(warningBg)));
				root.style.setProperty("--error", hsl(errorBg));
				root.style.setProperty("--error-foreground", hsl(theme.errorFg));
				root.style.setProperty("--error-on-bg", hsl(contrastText(errorBg)));
				root.style.setProperty("--destructive", hsl(theme.errorFg));
				root.style.setProperty("--destructive-foreground", hsl(contrastText(theme.errorFg)));
				root.style.setProperty("--wordle-state-r-bg", stateErrorBg);
				root.style.setProperty("--wordle-state-r-fg", contrastText(stateErrorBg));
				root.style.setProperty("--wordle-state-y-bg", stateWarningBg);
				root.style.setProperty("--wordle-state-y-fg", contrastText(stateWarningBg));
				root.style.setProperty("--wordle-state-g-bg", stateFastBg);
				root.style.setProperty("--wordle-state-g-fg", contrastText(stateFastBg));
				root.style.setProperty("--wordle-state-b-bg", stateEffortBg);
				root.style.setProperty("--wordle-state-b-fg", contrastText(stateEffortBg));
				root.style.setProperty("--wordle-key-neutral", mix(theme.text, theme.background, theme.tone === "dark" ? .78 : .74));
			}
			document.querySelectorAll("[data-theme-choice]").forEach((el) => el.toggleAttribute("data-selected", el.dataset.themeChoice === theme.selected));
			document.querySelectorAll("[data-font-choice]").forEach((el) => el.toggleAttribute("data-selected", el.dataset.fontChoice === theme.font));
			renderAppearancePanel();
			syncAdvancedMenuChecks();
			notify(theme);
			return theme;
		};
		const setPrefs = (patch) => {
			if (typeof patch.font === "string") try {
				nativeSetItem.call(localStorage, FONT_KEY, patch.font);
				volatileFont = void 0;
			} catch {
				volatileFont = patch.font;
			}
			const themePatch = { ...patch };
			delete themePatch.font;
			if (Object.keys(themePatch).length > 0) {
				const { font: _legacyFont, ...theme } = rawPrefs();
				const next = {
					...theme,
					...themePatch
				};
				try {
					nativeSetItem.call(localStorage, KEY, JSON.stringify(next));
					volatileThemePrefs = {};
				} catch {
					volatileThemePrefs = next;
				}
			}
			apply();
		};
		const appearance = Object.freeze({
			get: read,
			set: setPrefs,
			apply,
			themeIds: Object.freeze([
				"system",
				...COLOR_IDS,
				"custom"
			]),
			fontIds: Object.freeze([...FONT_IDS])
		});
		Object.defineProperty(globalThis, "SameyAppearance", {
			value: appearance,
			configurable: false,
			writable: false
		});
		const themeCatalog = () => {
			const raw = rawPrefs();
			const saved = normalizedSavedThemes(raw);
			return [
				["system", "System"],
				...Object.entries(config.colors).map(([id, value]) => [id, value.label]),
				...saved.map((theme) => [savedThemeId(theme.id), theme.name])
			];
		};
		const menuThemeIds = () => {
			const raw = rawPrefs();
			const catalog = new Set(themeCatalog().map(([id]) => id));
			const result = (Array.isArray(raw.menuThemes) ? raw.menuThemes.filter((id) => typeof id === "string") : DEFAULT_THEME_MENU).filter((id) => catalog.has(id) && id !== "clear-light" && !isColorblindPresetId(id));
			return result.length ? result : [...DEFAULT_THEME_MENU];
		};
		const themeSection = () => {
			const allowed = new Set(menuThemeIds());
			return `<div class="samey-panel-title">Themes</div>${themeCatalog().filter(([id]) => allowed.has(id)).map(([value, label]) => `<button type="button" data-theme-choice="${escapeHtml(value)}">${escapeHtml(label)}</button>`).join("")}`;
		};
		const fontSection = () => `<div class="samey-panel-title">Fonts</div>${["monospace", "sans-serif"].filter((id) => FONT_IDS.includes(id)).map((id) => `<button type="button" data-font-choice="${id}">${escapeHtml(fontLabels[id])}</button>`).join("")}`;
		const CURSOR_TOGGLE_POINTS = [
			[0, -13.1991],
			[-12.235, 8.0898],
			[12.235, 8.0898]
		];
		const CURSOR_TOGGLE_EDGES = [
			[
				0,
				-13.1991,
				-1.8964,
				-.1064,
				-12.235,
				8.0898,
				93.282
			],
			[
				-12.235,
				8.0898,
				0,
				3.1933,
				12.235,
				8.0898,
				92.994
			],
			[
				12.235,
				8.0898,
				1.8964,
				-.1064,
				0,
				-13.1991,
				93.282
			]
		];
		const CURSOR_TOGGLE_RAIL = "M 0 -13.1991 Q 1.8964 -0.1064 12.235 8.0898 Q 0 3.1933 -12.235 8.0898 Q -1.8964 -0.1064 0 -13.1991 Z";
		const cursorSection = () => {
			const mode = read().cursorMode;
			const state = CURSOR_MODES.indexOf(mode);
			const [x, y] = CURSOR_TOGGLE_POINTS[state] ?? CURSOR_TOGGLE_POINTS[0];
			return `<div class="samey-panel-title">Cursor</div><div class="samey-appearance-tools"><div class="samey-cursor-mode-row"><button type="button" class="samey-cursor-mode-toggle" data-cursor-mode-toggle aria-label="Cursor mode: ${CURSOR_LABELS[mode]}" aria-valuemin="0" aria-valuemax="2" aria-valuenow="${state}" aria-valuetext="${CURSOR_LABELS[mode]}"><svg viewBox="-33.235 -34.1991 66.47 63.2889" aria-hidden="true"><defs><radialGradient id="samey-cursor-toggle-glow" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="50" gradientTransform="translate(${x} ${y})"><stop offset="0" stop-color="var(--site-fg)" stop-opacity=".32"/><stop offset=".35" stop-color="var(--site-muted)" stop-opacity=".28"/><stop offset="1" stop-color="var(--site-bg)" stop-opacity=".18"/></radialGradient></defs><path d="${CURSOR_TOGGLE_RAIL}" fill="none" stroke="var(--site-line)" stroke-width="34.2" stroke-linecap="round" stroke-linejoin="round"/><path d="${CURSOR_TOGGLE_RAIL}" fill="none" stroke="url(#samey-cursor-toggle-glow)" stroke-width="34" stroke-linecap="round" stroke-linejoin="round"/><path d="${CURSOR_TOGGLE_RAIL}" fill="url(#samey-cursor-toggle-glow)"/><g data-cursor-toggle-knob transform="translate(${x} ${y})"><circle cx="0" cy="0" r="13" fill="var(--site-fg)" stroke="var(--site-bg)" stroke-width="1"/></g></svg></button><span class="samey-cursor-mode-name" data-cursor-mode-name>${CURSOR_LABELS[mode]}</span></div><div class="samey-appearance-tool-actions"><button type="button" data-open-advanced>Advanced &amp; Colorblind</button></div></div>`;
		};
		const bindCursorToggle = () => {
			const button = appearancePanel?.querySelector("[data-cursor-mode-toggle]");
			if (!button) return;
			const knob = button.querySelector("[data-cursor-toggle-knob]");
			const gradient = button.querySelector("radialGradient");
			const panel = appearancePanel;
			if (!panel) return;
			const name = panel.querySelector("[data-cursor-mode-name]");
			let state = Number(button.getAttribute("aria-valuenow")) || 0;
			let raf = 0, queued = 0;
			const ease = (t) => t < .5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
			const setPoint = (x, y) => {
				const transform = `translate(${x} ${y})`;
				knob?.setAttribute("transform", transform);
				gradient?.setAttribute("gradientTransform", transform);
			};
			const run = () => {
				if (raf) {
					queued++;
					return;
				}
				const from = state, to = (from + 1) % 3;
				const [x0, y0, cx, cy, x1, y1, duration] = CURSOR_TOGGLE_EDGES[from] ?? CURSOR_TOGGLE_EDGES[0];
				const start = performance.now();
				button.setAttribute("aria-valuenow", String(to));
				button.setAttribute("aria-valuetext", CURSOR_LABELS[CURSOR_MODES[to]]);
				button.setAttribute("aria-label", `Cursor mode: ${CURSOR_LABELS[CURSOR_MODES[to]]}`);
				if (name) name.textContent = CURSOR_LABELS[CURSOR_MODES[to]];
				const frame = (now) => {
					const raw = Math.min(1, (now - start) / duration), t = ease(raw), u = 1 - t;
					setPoint(u * u * x0 + 2 * u * t * cx + t * t * x1, u * u * y0 + 2 * u * t * cy + t * t * y1);
					if (raw < 1) {
						raf = requestAnimationFrame(frame);
						return;
					}
					state = to;
					const [px, py] = CURSOR_TOGGLE_POINTS[state] ?? CURSOR_TOGGLE_POINTS[0];
					setPoint(px, py);
					raf = 0;
					setPrefs({ cursorMode: CURSOR_MODES[state] });
					if (queued) {
						queued--;
						run();
					}
				};
				raf = requestAnimationFrame(frame);
			};
			button.addEventListener("click", (event) => {
				event.stopPropagation();
				run();
			});
			button.addEventListener("keydown", (event) => {
				if (event.key === "ArrowRight" || event.key === "ArrowDown") {
					event.preventDefault();
					run();
				}
			});
		};
		function renderAppearancePanel() {
			if (!appearancePanel) return;
			const wasHidden = appearancePanel.hidden;
			appearancePanel.innerHTML = themeSection() + fontSection() + cursorSection();
			appearancePanel.hidden = wasHidden;
			const theme = read();
			appearancePanel.querySelectorAll("[data-theme-choice]").forEach((el) => el.toggleAttribute("data-selected", el.dataset.themeChoice === theme.selected));
			appearancePanel.querySelectorAll("[data-font-choice]").forEach((el) => el.toggleAttribute("data-selected", el.dataset.fontChoice === theme.font));
			bindCursorToggle();
		}
		const positionAppearancePanel = (trigger) => {
			if (!appearancePanel || !trigger) return;
			const margin = 8;
			const gap = 6;
			const r = trigger.getBoundingClientRect();
			const width = appearancePanel.offsetWidth || 176;
			const height = appearancePanel.offsetHeight || 0;
			const left = Math.max(margin, Math.min(innerWidth - width - margin, r.right - width));
			const below = r.bottom + gap;
			const above = r.top - gap - height;
			const top = below + height <= innerHeight - margin ? below : Math.max(margin, above);
			appearancePanel.style.left = `${left}px`;
			appearancePanel.style.top = `${top}px`;
			appearancePanel.style.maxHeight = `${Math.max(80, innerHeight - top - margin)}px`;
			appearancePanel.style.overflowY = "auto";
		};
		const closeAppearance = () => {
			if (!appearancePanel) return;
			appearancePanel.hidden = true;
			appearanceTrigger?.setAttribute("aria-expanded", "false");
			appearanceTrigger = null;
		};
		const toggleAppearance = (trigger) => {
			if (!appearancePanel) mountControls();
			if (!appearancePanel) return;
			if (!appearancePanel.hidden && appearanceTrigger === trigger) return closeAppearance();
			appearanceTrigger?.setAttribute("aria-expanded", "false");
			appearanceTrigger = trigger;
			trigger.setAttribute("aria-expanded", "true");
			renderAppearancePanel();
			appearancePanel.hidden = false;
			positionAppearancePanel(trigger);
		};
		const editorFields = [
			["background", "Page background"],
			["text", "Text"],
			["blurTint", "Blur tint"],
			["shadowTint", "Shadow tint"],
			["selectionBg", "Selection background"],
			["selectionFg", "Selection text"],
			["accentFg", "Accent foreground"],
			["accentBg", "Accent background"],
			["errorFg", "Error foreground"],
			["errorBg", "Error background"],
			["warningFg", "Warning foreground"],
			["warningBg", "Warning background"],
			["slowFg", "Slow foreground"],
			["slowBg", "Slow background"],
			["fastFg", "Fast foreground"],
			["fastBg", "Fast background"],
			["effortFg", "Effort foreground"],
			["effortBg", "Effort background"]
		];
		const editorThemeFromInputs = () => {
			if (!advancedEditor) return read().custom;
			const value = { tone: advancedEditor.querySelector("[name=\"tone\"]")?.value === "dark" ? "dark" : "light" };
			for (const [key] of editorFields) {
				const input = advancedEditor.querySelector(`[name="${key}"]`);
				if (input && validHex(input.value)) value[key] = input.value.toLowerCase();
			}
			return normalizeTheme(value, value.tone === "dark" ? colors.dark : colors.light);
		};
		const fillAdvancedEditor = (theme = read()) => {
			if (!advancedEditor) return;
			const tone = advancedEditor.querySelector("[name=\"tone\"]");
			if (tone) tone.value = theme.tone;
			for (const [key] of editorFields) {
				const value = theme[key];
				if (!validHex(value)) continue;
				const color = advancedEditor.querySelector(`[data-color-for="${key}"]`);
				const text = advancedEditor.querySelector(`[name="${key}"]`);
				if (color) color.value = value;
				if (text) text.value = value;
			}
			const name = advancedEditor?.querySelector("[name=\"themeName\"]");
			if (name && !name.value) name.value = ("savedName" in theme ? theme.savedName : void 0) || "My theme";
		};
		const syncColorPair = (target) => {
			const key = target.dataset.colorFor || target.name;
			if (!key || !editorFields.some(([field]) => field === key)) return;
			const color = advancedEditor?.querySelector(`[data-color-for="${key}"]`);
			const text = advancedEditor?.querySelector(`[name="${key}"]`);
			if (target.matches("input[type=\"color\"]") && text) text.value = target.value;
			else if (validHex(target.value) && color) color.value = target.value;
		};
		const previewAdvanced = () => setPrefs({
			color: "custom",
			custom: editorThemeFromInputs()
		});
		const makeSavedId = (name) => {
			return `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 36) || "theme"}-${Date.now().toString(36)}`;
		};
		const saveAdvancedTheme = () => {
			const raw = rawPrefs();
			if (!advancedEditor) return;
			const name = advancedEditor.querySelector("[name=\"themeName\"]")?.value.trim() || "Saved theme";
			const theme = editorThemeFromInputs();
			const savedThemes = normalizedSavedThemes(raw);
			const id = makeSavedId(name);
			savedThemes.push({
				id,
				name,
				...theme
			});
			const menuThemes = [.../* @__PURE__ */ new Set([...menuThemeIds(), savedThemeId(id)])];
			setPrefs({
				savedThemes,
				menuThemes,
				color: savedThemeId(id)
			});
			renderAdvancedSavedThemes();
		};
		const checkIcon = `<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.1 6.2 4.8 8.8 9.9 3.4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
		const advancedMenuList = () => themeCatalog().filter(([id]) => id !== "clear-light" && !isColorblindPresetId(id)).map(([id, label]) => {
			const checked = menuThemeIds().includes(id) ? " checked" : "";
			return `<label class="samey-control samey-control-checkbox"><input class="samey-control-native" type="checkbox" data-menu-theme="${escapeHtml(id)}"${checked}><span class="samey-checkbox-indicator" aria-hidden="true">${checkIcon}</span><span class="samey-control-text">${escapeHtml(label)}</span></label>`;
		}).join("");
		const renderAdvancedSavedThemes = () => {
			if (!advancedPage) return;
			const host = advancedPage.querySelector("[data-saved-themes]");
			if (!host) return;
			const saved = normalizedSavedThemes();
			host.innerHTML = saved.length ? saved.map((theme) => `<div class="samey-saved-theme"><button type="button" data-load-saved="${escapeHtml(theme.id)}">${escapeHtml(theme.name)}</button><button type="button" data-delete-saved="${escapeHtml(theme.id)}" aria-label="Delete ${escapeHtml(theme.name)}">×</button></div>`).join("") : `<p class="samey-advanced-empty">No saved themes yet.</p>`;
			const menu = advancedPage.querySelector("[data-theme-menu-list]");
			if (menu) menu.innerHTML = advancedMenuList();
		};
		function syncAdvancedMenuChecks() {
			if (!advancedPage || advancedPage.hidden) return;
			const allowed = new Set(menuThemeIds());
			advancedPage.querySelectorAll("[data-menu-theme]").forEach((input) => {
				input.checked = allowed.has(input.dataset.menuTheme ?? "");
			});
		}
		const setMenuThemeAllowed = (id, allowed) => {
			const set = new Set(menuThemeIds());
			if (allowed) set.add(id);
			else set.delete(id);
			if (set.size === 0) set.add("system");
			setPrefs({ menuThemes: [...set] });
		};
		const deleteSavedTheme = (id) => {
			const raw = rawPrefs();
			const selectedId = savedThemeId(id);
			const patch = {
				savedThemes: normalizedSavedThemes(raw).filter((theme) => theme.id !== id),
				menuThemes: menuThemeIds().filter((themeId) => themeId !== selectedId)
			};
			if (read().selected === selectedId) patch.color = "system";
			setPrefs(patch);
			renderAdvancedSavedThemes();
		};
		const loadSavedIntoEditor = (id) => {
			const saved = normalizedSavedThemes().find((theme) => theme.id === id);
			if (!saved) return;
			const name = advancedEditor?.querySelector("[name=\"themeName\"]");
			if (name) name.value = saved.name;
			fillAdvancedEditor(saved);
			previewAdvanced();
		};
		const loadPresetIntoEditor = (id, extraPrefs = {}) => {
			const preset = colors[id];
			if (!preset) return;
			const name = advancedEditor?.querySelector("[name=\"themeName\"]");
			if (name) name.value = `${config.colors[id]?.label || id} custom`;
			fillAdvancedEditor(preset);
			setPrefs({
				color: "custom",
				custom: editorThemeFromInputs(),
				...extraPrefs
			});
		};
		const rawColorblindChoice = () => {
			const raw = rawPrefs();
			return {
				profile: COLORBLIND_PROFILES.some(([id]) => id === raw.colorblindProfile) ? raw.colorblindProfile : "deuteranopia",
				variant: COLORBLIND_VARIANTS.some(([id]) => id === raw.colorblindVariant) ? raw.colorblindVariant : "light"
			};
		};
		let colorblindChoice = rawColorblindChoice();
		const radioControl = (name, value, label, checked) => `<label class="samey-control samey-control-radio"><input class="samey-control-native" type="radio" name="${name}" value="${escapeHtml(value)}"${checked ? " checked" : ""}><span class="samey-radio-indicator" aria-hidden="true"><span></span></span><span class="samey-control-text">${escapeHtml(label)}</span></label>`;
		const colorblindControls = () => `<div class="samey-colorblind-chooser"><fieldset><legend>Profile</legend><div class="samey-control-list" data-colorblind-profile>${COLORBLIND_PROFILES.map(([id, label]) => radioControl("samey-colorblind-profile", id, label, colorblindChoice.profile === id)).join("")}</div></fieldset><fieldset><legend>Variant</legend><div class="samey-control-list" data-colorblind-variant>${COLORBLIND_VARIANTS.map(([id, label]) => radioControl("samey-colorblind-variant", id, label, colorblindChoice.variant === id)).join("")}</div></fieldset></div>`;
		const applyColorblindChoice = () => {
			const id = colorblindPresetId(String(colorblindChoice.profile), String(colorblindChoice.variant));
			loadPresetIntoEditor(id, {
				colorblindProfile: colorblindChoice.profile,
				colorblindVariant: colorblindChoice.variant
			});
		};
		const mountAdvancedPage = () => {
			if (advancedPage) return;
			const page = document.createElement("div");
			page.className = "samey-theme-advanced";
			page.dataset.sameyOverlay = "";
			page.dataset.sameyRuntime = "";
			page.hidden = true;
			page.innerHTML = `<div class="samey-theme-advanced-shell"><header><div><span>Appearance</span><h1>Advanced &amp; Colorblind</h1></div><button type="button" class="samey-ui-button samey-icon-button" data-close-advanced aria-label="Close Advanced &amp; Colorblind">×</button></header><main><section class="samey-advanced-editor" data-advanced-editor><div class="samey-advanced-field"><label><span>Theme name</span><input class="samey-ui-input" name="themeName" value="My theme" maxlength="80"></label><label><span>Tone</span><select class="samey-ui-select" name="tone"><option value="light">Light</option><option value="dark">Dark</option></select></label></div><div class="samey-advanced-color-grid">${editorFields.map(([key, label]) => `<label><span>${escapeHtml(label)}</span><span class="samey-color-input"><input class="samey-ui-color" type="color" data-color-for="${key}" aria-label="${escapeHtml(label)} color"><input class="samey-ui-input" name="${key}" spellcheck="false" maxlength="7"></span></label>`).join("")}</div><div class="samey-advanced-actions"><button type="button" class="samey-ui-button samey-ui-button-primary" data-save-theme>Save theme</button><button type="button" class="samey-ui-button" data-reset-editor>Reset to current</button></div></section><aside><section data-colorblind-section><h2>Colorblind</h2><p>Choose the vision profile and luminance variant independently. Changes preview immediately and remain editable.</p>${colorblindControls()}</section><section><h2>Theme menu</h2><p>Choose which standard and saved themes appear in the compact menu. Colorblind choices stay in this page instead of becoming nine separate menu entries.</p><div class="samey-advanced-check-list" data-theme-menu-list></div></section><section><h2>Saved themes</h2><div data-saved-themes></div></section></aside></main></div>`;
			document.body.append(page);
			advancedPage = page;
			const editor = page.querySelector("[data-advanced-editor]");
			if (!editor) throw new Error("Advanced appearance editor is missing");
			advancedEditor = editor;
			editor.addEventListener("input", (event) => {
				const target = event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement ? event.target : null;
				if (!target || target.name === "themeName") return;
				if (target instanceof HTMLInputElement) syncColorPair(target);
				if (target.name === "tone") {
					const current = editorThemeFromInputs();
					const normalized = normalizeTheme({
						...current,
						tone: target.value
					}, target.value === "dark" ? colors.dark : colors.light);
					fillAdvancedEditor(normalized);
				}
				if (target.matches("input[type=\"color\"]") || validHex(target.value) || target.name === "tone") previewAdvanced();
			});
			page.addEventListener("click", (event) => {
				const target = eventElement(event)?.closest("button");
				if (!target) return;
				if (target.hasAttribute("data-close-advanced")) closeAdvanced();
				else if (target.hasAttribute("data-save-theme")) saveAdvancedTheme();
				else if (target.hasAttribute("data-reset-editor")) {
					const name = editor.querySelector("[name=\"themeName\"]");
					if (name) name.value = read().savedName || "My theme";
					fillAdvancedEditor(read());
				} else if (target.dataset.loadSaved) loadSavedIntoEditor(target.dataset.loadSaved);
				else if (target.dataset.deleteSaved) deleteSavedTheme(target.dataset.deleteSaved);
			});
			page.addEventListener("change", (event) => {
				const input = event.target instanceof HTMLInputElement ? event.target : null;
				if (!input) return;
				if (input.matches("[name=\"samey-colorblind-profile\"]")) {
					colorblindChoice = {
						...colorblindChoice,
						profile: input.value
					};
					applyColorblindChoice();
					return;
				}
				if (input.matches("[name=\"samey-colorblind-variant\"]")) {
					colorblindChoice = {
						...colorblindChoice,
						variant: input.value
					};
					applyColorblindChoice();
					return;
				}
				const menuInput = input.closest("[data-menu-theme]");
				if (menuInput?.dataset.menuTheme) setMenuThemeAllowed(menuInput.dataset.menuTheme, menuInput.checked);
			});
		};
		const openAdvanced = () => {
			mountAdvancedPage();
			closeAppearance();
			const page = advancedPage;
			if (!page) return;
			colorblindChoice = rawColorblindChoice();
			page.querySelectorAll("[name=\"samey-colorblind-profile\"]").forEach((input) => {
				input.checked = input.value === colorblindChoice.profile;
			});
			page.querySelectorAll("[name=\"samey-colorblind-variant\"]").forEach((input) => {
				input.checked = input.value === colorblindChoice.variant;
			});
			const themeName = advancedEditor?.querySelector("[name=\"themeName\"]");
			if (themeName) themeName.value = read().savedName || "My theme";
			fillAdvancedEditor(read());
			renderAdvancedSavedThemes();
			page.hidden = false;
			document.documentElement.classList.add("samey-advanced-open");
			page.scrollTop = 0;
		};
		const closeAdvanced = () => {
			if (!advancedPage) return;
			advancedPage.hidden = true;
			document.documentElement.classList.remove("samey-advanced-open");
		};
		const mountControls = () => {
			if (appearancePanel) return;
			const panel = document.createElement("div");
			panel.id = "samey-theme-panel";
			panel.className = "samey-theme-panel";
			panel.dataset.sameyRuntime = "";
			panel.dataset.sameyOverlay = "";
			panel.hidden = true;
			panel.addEventListener("click", (event) => {
				const target = eventElement(event);
				const themeButton = target?.closest("[data-theme-choice]");
				if (themeButton) setPrefs({ color: themeButton.dataset.themeChoice });
				const fontButton = target?.closest("[data-font-choice]");
				if (fontButton) setPrefs({ font: fontButton.dataset.fontChoice });
				if (target?.closest("[data-open-advanced]")) openAdvanced();
			});
			document.body.append(panel);
			appearancePanel = panel;
			document.addEventListener("click", (event) => {
				const trigger = eventElement(event)?.closest("[data-samey-appearance]");
				if (trigger) {
					event.preventDefault();
					event.stopPropagation();
					toggleAppearance(trigger);
					return;
				}
				if (event.target instanceof Node && !panel.contains(event.target)) closeAppearance();
			});
			addEventListener("resize", () => appearanceTrigger && positionAppearancePanel(appearanceTrigger), { passive: true });
			addEventListener("samey-pageleave", closeAppearance);
			addEventListener("keydown", (event) => {
				if (event.key === "Escape" && advancedPage && !advancedPage.hidden) closeAdvanced();
			});
			renderAppearancePanel();
			apply();
		};
		globalThis.SameyOpenAppearance = (trigger) => toggleAppearance(trigger);
		const pushState = history.pushState.bind(history);
		const replaceState = history.replaceState.bind(history);
		const NAV_INDEX_KEY = "__sameyNavIndex";
		const readNavigationIndex = () => Number.isFinite(history.state?.[NAV_INDEX_KEY]) ? history.state[NAV_INDEX_KEY] : null;
		let pageHistoryIndex = readNavigationIndex() ?? 0;
		const writePageHistory = (url, replace) => {
			const current = readNavigationIndex();
			if (current != null) pageHistoryIndex = current;
			if (!replace) pageHistoryIndex += 1;
			const state = {
				...history.state || {},
				[NAV_INDEX_KEY]: pageHistoryIndex
			};
			(replace ? replaceState : pushState)(state, "", url.href);
		};
		const runtimeNode = (el) => {
			el.dataset.sameyRuntime = "";
			return el;
		};
		const normalizeExternalLinks = (root = document) => {
			for (const link of root.querySelectorAll("a[href]")) {
				let url;
				try {
					url = new URL(link.href, location.href);
				} catch {
					continue;
				}
				if (!/^https?:$/.test(url.protocol) || url.origin === location.origin) continue;
				delete link.dataset.sameyExternal;
				link.target = "_blank";
				link.rel = "noopener noreferrer";
			}
		};
		const observeExternalLinks = () => new MutationObserver((records) => {
			for (const record of records) for (const node of record.addedNodes) {
				if (!(node instanceof Element) || node.closest?.(".monaco-host, .monaco-editor, .monaco-diff-editor")) continue;
				if (node.matches("a[href]")) normalizeExternalLinks(node.parentElement ?? document);
				else normalizeExternalLinks(node);
			}
		}).observe(document.documentElement, {
			subtree: true,
			childList: true
		});
		const loadingFrames = generateLoadingFrames;
		const loadingCursorSvg = generateAnimatedSineCircleSvg;
		globalThis.SameyLoadingSvg = loadingCursorSvg;
		let directLoading = false;
		let loadingTasks = 0;
		let loadingState = false;
		const publishLoading = () => {
			const on = directLoading || loadingTasks > 0;
			if (on === loadingState) return;
			loadingState = on;
			document.documentElement.toggleAttribute("data-site-loading", on);
			dispatchEvent(new CustomEvent("samey-loading", { detail: on }));
		};
		globalThis.SameyLoading = (value) => {
			directLoading = !!value;
			publishLoading();
		};
		globalThis.SameyLoadingBegin = () => {
			loadingTasks++;
			publishLoading();
			let active = true;
			return () => {
				if (!active) return;
				active = false;
				loadingTasks = Math.max(0, loadingTasks - 1);
				publishLoading();
			};
		};
		globalThis.SameyLoadingBeginAfterDelay = (delay = 120) => {
			let active = true;
			let release;
			const timer = setTimeout(() => {
				if (active) release = globalThis.SameyLoadingBegin?.();
			}, delay);
			return () => {
				if (!active) return;
				active = false;
				clearTimeout(timer);
				release?.();
			};
		};
		const mountLoadingBar = () => {
			if (document.getElementById("samey-loading-top")) return;
			const root = runtimeNode(document.createElement("div"));
			root.id = "samey-loading-top";
			root.className = "samey-loading-top";
			root.setAttribute("role", "progressbar");
			root.setAttribute("aria-label", "Loading");
			root.innerHTML = "<span class=\"samey-loading-top-bar\"></span>";
			document.body.append(root);
		};
		const mountCursor = () => {
			if (!matchMedia?.("(pointer:fine)").matches || document.getElementById("samey-cursor")) return;
			const cursor = runtimeNode(document.createElement("div"));
			cursor.id = "samey-cursor";
			cursor.className = "samey-cursor";
			cursor.innerHTML = `<span class="samey-cursor-dot"></span><span class="samey-cursor-text"></span><svg class="samey-cursor-grab" viewBox="0 0 64 64" width="64" height="64" aria-hidden="true"><mask id="samey-grab-mask" x="0" y="0" width="64" height="64" maskUnits="userSpaceOnUse" style="mask-type:luminance"><circle cx="32" cy="32" r="8.4" fill="white"/><rect x="30.2" y="22.4" width="3.6" height="19.2" fill="black"/><rect x="22.4" y="30.2" width="19.2" height="3.6" fill="black"/></mask><circle cx="32" cy="32" r="8.4" fill="currentColor" mask="url(#samey-grab-mask)"/><circle cx="32" cy="32" r="4.8" fill="currentColor"><animate class="samey-cursor-grab-pulse" attributeName="r" values="8.4;4.8" dur=".18s" repeatCount="1" calcMode="linear" begin="indefinite" fill="remove"/></circle></svg>${loadingCursorSvg()}`;
			const linkFill = runtimeNode(document.createElement("div"));
			linkFill.className = "samey-cursor-link-fill";
			linkFill.hidden = true;
			const fillSlices = [];
			const ensureFillSlice = (index) => {
				while (fillSlices.length <= index) {
					const slice = document.createElement("span");
					slice.className = "samey-cursor-link-fill-slice";
					slice.hidden = true;
					linkFill.append(slice);
					fillSlices.push(slice);
				}
				return fillSlices[index];
			};
			const dragPreview = runtimeNode(document.createElement("div"));
			dragPreview.className = "samey-drag-preview";
			dragPreview.hidden = true;
			document.body.append(linkFill, dragPreview, cursor);
			let cursorMode = read().cursorMode;
			const loadingPath = cursor.querySelector(".samey-cursor-loading path");
			loadingPath?.querySelector("animate")?.remove();
			let cursorVisible = false;
			let cursorLoading = false;
			const setCursorVisible = (visible) => {
				visible = !!visible && cursorMode === "invert";
				if (cursorVisible === visible) return;
				cursorVisible = visible;
				if (visible) cursor.dataset.visible = "";
				else delete cursor.dataset.visible;
			};
			let loadingRaf = 0, loadingStarted = 0;
			let refreshCursorMode = () => {};
			const animateLoadingPaths = (time) => {
				if (!cursorLoading) {
					loadingRaf = 0;
					return;
				}
				const frames = loadingFrames();
				const duration = loadingGeometry.duration * 1e3;
				const progress = Math.max(0, time - loadingStarted) % duration / duration;
				const frame = Math.max(0, Math.min(frames.length - 1, Math.floor(progress * (frames.length - 1))));
				loadingPath?.setAttribute("d", frames[frame]);
				loadingRaf = requestAnimationFrame(animateLoadingPaths);
			};
			const setLoading = (loading) => {
				cursorLoading = !!loading;
				cursor.toggleAttribute("data-loading", cursorLoading);
				if (loading) {
					clearCursorIdle();
					cursor.removeAttribute("data-grab");
					cursor.removeAttribute("data-text");
					if (cursorMode === "invert") setCursorVisible(true);
				}
				document.documentElement.toggleAttribute("data-site-loading", !!loading);
				if (loading && !loadingRaf) {
					loadingStarted = performance.now();
					loadingPath?.setAttribute("d", loadingFrames()[0]);
					loadingRaf = requestAnimationFrame(animateLoadingPaths);
				}
				if (!loading && loadingRaf) {
					cancelAnimationFrame(loadingRaf);
					loadingRaf = 0;
				}
				if (!loading) {
					refreshCursorMode();
					if (cursorMode === "invert" && cursorVisible) armCursorIdle();
				}
			};
			addEventListener("samey-loading", () => setLoading(loadingState));
			if (loadingState) queueMicrotask(() => {
				if (loadingState) setLoading(true);
			});
			const parseRgb = (value) => {
				const text = String(value || "").trim().toLowerCase();
				const parts = text.match(/[+-]?(?:\d+\.?\d*|\.\d+)/g)?.map(Number) || [];
				if (parts.length < 3) return null;
				if (text.startsWith("color(srgb ")) return {
					r: parts[0] * 255,
					g: parts[1] * 255,
					b: parts[2] * 255,
					a: parts.length > 3 ? parts[3] : 1
				};
				if (!text.startsWith("rgb")) return null;
				return {
					r: parts[0],
					g: parts[1],
					b: parts[2],
					a: parts.length > 3 ? parts[3] : 1
				};
			};
			const effectiveBackdropLuma = (target) => {
				let el = target instanceof Element ? target : document.body;
				while (el) {
					const style = getComputedStyle(el);
					const rgb = parseRgb(style.backgroundColor);
					if (rgb && rgb.a >= .75) return (rgb.r * .2126 + rgb.g * .7152 + rgb.b * .0722) / 255;
					el = el.parentElement;
				}
				const fallback = parseRgb(getComputedStyle(document.body).backgroundColor);
				return fallback ? (fallback.r * .2126 + fallback.g * .7152 + fallback.b * .0722) / 255 : 1;
			};
			let blendTarget = null;
			let blendThemeBackground = "";
			const updateBlendSource = (target) => {
				const themeBackground = document.documentElement.style.getPropertyValue("--site-bg");
				if (blendTarget === target && blendThemeBackground === themeBackground) return;
				blendTarget = target;
				blendThemeBackground = themeBackground;
				const lightBackdrop = effectiveBackdropLuma(target) >= .45;
				const source = lightBackdrop ? "#ccc" : "#fff";
				cursor.style.setProperty("--samey-cursor-blend", source);
				linkFill.style.setProperty("--samey-cursor-blend", source);
				cursor.dataset.blendSource = lightBackdrop ? "light" : "dark";
			};
			const zIndexOf = (el) => {
				const z = Number.parseInt(getComputedStyle(el).zIndex, 10);
				return Number.isFinite(z) ? z : 0;
			};
			const containingOverlay = (target) => target instanceof Element ? target.closest("[data-samey-overlay]") : null;
			const cssFillLayer = Number.parseInt(getComputedStyle(document.documentElement).getPropertyValue("--samey-z-link-fill"), 10);
			const baseFillLayer = Number.isFinite(cssFillLayer) ? cssFillLayer : 2147483e3;
			let fillLayer = baseFillLayer;
			const fillLayerFor = (target) => {
				const overlay = containingOverlay(target);
				return overlay ? Math.min(2147483645, zIndexOf(overlay) + 1) : baseFillLayer;
			};
			const setFillLayer = (target) => {
				fillLayer = fillLayerFor(target);
				for (const slice of fillSlices) slice.style.zIndex = String(fillLayer);
				refreshFillOcclusionRects(target);
			};
			const overlaySelector = "[data-samey-overlay],[data-samey-overlay-backdrop],[data-samey-overlay-blocker]";
			let visibleOverlays = [];
			let overlayRefreshFrame = 0;
			let fillOcclusionRects = [];
			let fillOcclusionKey = "";
			const overlayIsVisible = (el) => {
				if (!(el instanceof HTMLElement) || !el.isConnected || el.hidden || el.getAttribute("aria-hidden") === "true" || el.dataset.open === "false") return false;
				const style = getComputedStyle(el);
				if (style.display === "none" || style.visibility === "hidden") return false;
				const rect = el.getBoundingClientRect();
				return rect.width > 0 && rect.height > 0;
			};
			function refreshFillOcclusionRects(target = fillTarget) {
				const width = Math.max(1, innerWidth);
				const height = Math.max(1, innerHeight);
				const fillZ = target ? fillLayerFor(target) : fillLayer;
				const holes = visibleOverlays.filter((overlay) => zIndexOf(overlay) > fillZ).map((overlay) => overlay.getBoundingClientRect()).map((rect) => ({
					left: Math.max(0, Math.floor(rect.left - 1)),
					top: Math.max(0, Math.floor(rect.top - 1)),
					right: Math.min(width, Math.ceil(rect.right + 1)),
					bottom: Math.min(height, Math.ceil(rect.bottom + 1))
				})).filter((rect) => rect.right > rect.left && rect.bottom > rect.top);
				const key = `${width}x${height}@${fillZ}:` + holes.map(({ left, top, right, bottom }) => `${left},${top},${right},${bottom}`).join(";");
				if (key === fillOcclusionKey) return;
				fillOcclusionKey = key;
				fillOcclusionRects = holes;
				if (fillVisible) renderFillSlices();
			}
			const refreshOverlayState = () => {
				overlayRefreshFrame = 0;
				visibleOverlays = [...document.querySelectorAll(overlaySelector)].filter(overlayIsVisible);
				refreshFillOcclusionRects();
				refreshCursorMode();
			};
			const queueOverlayRefresh = () => {
				if (!overlayRefreshFrame) overlayRefreshFrame = requestAnimationFrame(refreshOverlayState);
			};
			new MutationObserver(queueOverlayRefresh).observe(document.documentElement, {
				subtree: true,
				childList: true,
				attributes: true,
				attributeFilter: [
					"hidden",
					"aria-hidden",
					"data-open"
				]
			});
			addEventListener("resize", queueOverlayRefresh, { passive: true });
			addEventListener("scroll", queueOverlayRefresh, {
				passive: true,
				capture: true
			});
			queueOverlayRefresh();
			const grabSelector = ".samey-vscroll-thumb,.samey-hscroll-thumb,input[type=range],[draggable=true],[data-grab-cursor]";
			const pressedGrabSelector = `${grabSelector},[data-grab-cursor-on-drag]`;
			const wantsGrab = (target) => {
				if (!(target instanceof Element)) return false;
				if (target.closest(grabSelector)) return true;
				const value = getComputedStyle(target).cursor;
				return value === "grab" || value === "grabbing" || value === "ew-resize" || value === "ns-resize" || value === "col-resize" || value === "row-resize";
			};
			const linkTarget = (target) => target instanceof Element ? target.closest("a[href],area[href],[role=link]") : null;
			const elementAt = (event) => {
				if (!Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) return event.target instanceof Element ? event.target : null;
				return document.elementFromPoint(event.clientX, event.clientY) || (event.target instanceof Element ? event.target : null);
			};
			const grabPulse = cursor.querySelector(".samey-cursor-grab-pulse");
			const setTextState = (text) => {
				cursor.toggleAttribute("data-text", !!text);
				if (text) document.documentElement.dataset.sameyCursorShape = "text";
				else if (!cursor.hasAttribute("data-grab")) document.documentElement.dataset.sameyCursorShape = "dot";
			};
			const setGrabState = (grab) => {
				const wasGrab = cursor.hasAttribute("data-grab");
				cursor.toggleAttribute("data-grab", grab);
				if (grab) document.documentElement.dataset.sameyCursorShape = "grab";
				else if (!cursor.hasAttribute("data-text")) document.documentElement.dataset.sameyCursorShape = "dot";
				if (grab) setTextState(false);
				if (grab && !wasGrab && !matchMedia?.("(prefers-reduced-motion: reduce)").matches && typeof grabPulse?.beginElement === "function") grabPulse.beginElement();
			};
			const holdLinkCursor = (event, link) => {
				if (!link) return;
				linkHandoffUntil = performance.now() + 240;
				if (Number.isFinite(event.clientX) && Number.isFinite(event.clientY)) placeXY(event.clientX, event.clientY);
				setGrabState(false);
				cursor.removeAttribute("data-grab");
				wakeCursor();
			};
			let nativeDragging = false;
			let selectingText = false;
			let pressedGrab = false;
			let pressedPointerId = null;
			let lastX = 0, lastY = 0;
			let pendingX = 0, pendingY = 0;
			let hasPointerPosition = false;
			let linkHandoffUntil = 0;
			let modifiedLinkPending = null;
			let suppressModifiedClick = null;
			const renderCursorPosition = (x = pendingX, y = pendingY) => {
				cursor.style.transform = `translate3d(${x - 32}px,${y - 32}px,0)`;
			};
			const latestPointerSample = (event) => {
				const samples = typeof event.getCoalescedEvents === "function" ? event.getCoalescedEvents() : null;
				return samples?.length ? samples[samples.length - 1] : event;
			};
			const placeXY = (x, y) => {
				if (!Number.isFinite(x) || !Number.isFinite(y)) return;
				hasPointerPosition = true;
				lastX = pendingX = x;
				lastY = pendingY = y;
				if (cursorMode === "invert") renderCursorPosition(x, y);
			};
			const place = (event) => {
				const sample = latestPointerSample(event);
				placeXY(sample.clientX, sample.clientY);
			};
			let dragPreviewW = 0, dragPreviewH = 0;
			const placeDragPreview = (x, y) => {
				if (dragPreview.hidden || !Number.isFinite(x) || !Number.isFinite(y)) return;
				const px = Math.max(8, Math.min(innerWidth - dragPreviewW - 8, x - dragPreviewW / 2));
				const py = Math.max(8, Math.min(innerHeight - dragPreviewH - 8, y - dragPreviewH / 2));
				dragPreview.style.transform = `translate3d(${px}px,${py}px,0)`;
			};
			const compactDragText = (value, max = 76) => {
				const text = String(value || "").replace(/\s+/g, " ").trim();
				return text.length > max ? `${text.slice(0, max - 1)}…` : text;
			};
			const showDragPreview = (kind, value, x = pendingX, y = pendingY) => {
				const text = compactDragText(value);
				if (!text) {
					dragPreview.hidden = true;
					return;
				}
				dragPreview.dataset.kind = kind;
				dragPreview.textContent = text;
				dragPreview.hidden = false;
				dragPreviewW = dragPreview.offsetWidth;
				dragPreviewH = dragPreview.offsetHeight;
				placeDragPreview(x, y);
			};
			const hideDragPreview = () => {
				dragPreview.hidden = true;
				delete dragPreview.dataset.kind;
				dragPreview.textContent = "";
			};
			const linkDragLabel = (link) => {
				const label = compactDragText(link?.textContent || link?.getAttribute?.("aria-label") || link?.title || "", 56);
				const href = link instanceof HTMLAnchorElement || link instanceof HTMLAreaElement ? link.href : link?.getAttribute?.("href");
				if (!href) return label || "Link";
				try {
					const url = new URL(href, location.href);
					const host = url.origin === location.origin ? url.pathname : url.hostname.replace(/^www\./, "");
					return label ? `${label} · ${host}` : host;
				} catch {
					return label || "Link";
				}
			};
			const fillDot = 16.8;
			let fillTarget = null, fillVisible = false, fillCollapsing = false, fillFrame = 0, fillLastTime = 0;
			let fillX = 0, fillY = 0, fillW = fillDot, fillH = fillDot;
			let wantedFillX = 0, wantedFillY = 0, wantedFillW = fillDot, wantedFillH = fillDot;
			let fillCollapseStart = 0, fillCollapseFromX = 0, fillCollapseFromY = 0, fillCollapseFromW = fillDot, fillCollapseFromH = fillDot;
			const fillCollapseDuration = 132;
			const fillCollapseCurve = (t) => t - Math.sin(Math.PI * 2 * t) * .1;
			let geometryLink = null, geometryRects = [], geometryBounds = null;
			const subtractRect = (rect, hole) => {
				const left = Math.max(rect.left, hole.left), top = Math.max(rect.top, hole.top);
				const right = Math.min(rect.right, hole.right), bottom = Math.min(rect.bottom, hole.bottom);
				if (right <= left || bottom <= top) return [rect];
				const pieces = [];
				if (rect.top < top) pieces.push({
					left: rect.left,
					top: rect.top,
					right: rect.right,
					bottom: top
				});
				if (bottom < rect.bottom) pieces.push({
					left: rect.left,
					top: bottom,
					right: rect.right,
					bottom: rect.bottom
				});
				if (rect.left < left) pieces.push({
					left: rect.left,
					top,
					right: left,
					bottom
				});
				if (right < rect.right) pieces.push({
					left: right,
					top,
					right: rect.right,
					bottom
				});
				return pieces;
			};
			function renderFillSlices() {
				if (!fillVisible) return;
				let pieces = [{
					left: fillX - fillW / 2,
					top: fillY - fillH / 2,
					right: fillX + fillW / 2,
					bottom: fillY + fillH / 2
				}];
				for (const hole of fillOcclusionRects) {
					pieces = pieces.flatMap((piece) => subtractRect(piece, hole));
					if (pieces.length === 0) break;
				}
				for (let i = 0; i < pieces.length; i++) {
					const piece = pieces[i];
					const width = piece.right - piece.left, height = piece.bottom - piece.top;
					const slice = ensureFillSlice(i);
					slice.hidden = width <= 0 || height <= 0;
					slice.style.zIndex = String(fillLayer);
					slice.style.transform = `translate3d(${piece.left}px,${piece.top}px,0) scale3d(${width / fillDot},${height / fillDot},1)`;
				}
				for (let i = pieces.length; i < fillSlices.length; i++) fillSlices[i].hidden = true;
			}
			const refreshLinkGeometry = (link) => {
				geometryLink = link;
				geometryRects = link ? [...link.getClientRects()].filter((rect) => rect.width > 0 && rect.height > 0) : [];
				geometryBounds = link ? link.getBoundingClientRect() : null;
			};
			const linkRect = (link, force = false) => {
				if (force || geometryLink !== link || !geometryBounds) refreshLinkGeometry(link);
				return geometryRects.find((rect) => pendingX >= rect.left && pendingX <= rect.right && pendingY >= rect.top && pendingY <= rect.bottom) ?? geometryBounds ?? link.getBoundingClientRect();
			};
			const updateFillGoal = (forceGeometry = false) => {
				if (!fillTarget?.isConnected) return setFillTarget(null);
				const rect = linkRect(fillTarget, forceGeometry);
				const insetX = Math.min(8, Math.max(2, rect.width * .04));
				const insetY = Math.min(6, Math.max(1, rect.height * .12));
				const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
				const nx = Math.max(-1, Math.min(1, (pendingX - cx) / Math.max(1, rect.width / 2)));
				const ny = Math.max(-1, Math.min(1, (pendingY - cy) / Math.max(1, rect.height / 2)));
				wantedFillW = Math.max(fillDot, rect.width - insetX * 2);
				wantedFillH = Math.max(fillDot, rect.height - insetY * 2);
				wantedFillX = cx + nx * Math.min(12, wantedFillW * .08);
				wantedFillY = cy + ny * Math.min(8, wantedFillH * .08);
			};
			const renderFill = (time) => {
				fillFrame = 0;
				const reduced = matchMedia?.("(prefers-reduced-motion: reduce)").matches;
				if (fillCollapsing) {
					if (!fillCollapseStart) fillCollapseStart = time;
					const raw = reduced ? 1 : Math.min(1, Math.max(0, (time - fillCollapseStart) / fillCollapseDuration));
					const t = fillCollapseCurve(raw);
					fillX = fillCollapseFromX + (wantedFillX - fillCollapseFromX) * t;
					fillY = fillCollapseFromY + (wantedFillY - fillCollapseFromY) * t;
					fillW = fillCollapseFromW + (wantedFillW - fillCollapseFromW) * t;
					fillH = fillCollapseFromH + (wantedFillH - fillCollapseFromH) * t;
					renderFillSlices();
					if (raw >= 1) {
						fillX = wantedFillX;
						fillY = wantedFillY;
						fillW = wantedFillW;
						fillH = wantedFillH;
						fillVisible = fillCollapsing = false;
						fillCollapseStart = fillLastTime = 0;
						linkFill.hidden = true;
					} else fillFrame = requestAnimationFrame(renderFill);
					return;
				}
				const dt = fillLastTime ? Math.min(34, Math.max(1, time - fillLastTime)) : 16.667;
				fillLastTime = time;
				const alpha = (tau) => reduced ? 1 : 1 - Math.exp(-dt / tau);
				const posEase = alpha(42);
				const sizeEase = alpha(62);
				fillX += (wantedFillX - fillX) * posEase;
				fillY += (wantedFillY - fillY) * posEase;
				fillW += (wantedFillW - fillW) * sizeEase;
				fillH += (wantedFillH - fillH) * sizeEase;
				renderFillSlices();
				if (!(Math.abs(fillX - wantedFillX) < .35 && Math.abs(fillY - wantedFillY) < .35 && Math.abs(fillW - wantedFillW) < .35 && Math.abs(fillH - wantedFillH) < .35)) fillFrame = requestAnimationFrame(renderFill);
				else fillLastTime = 0;
			};
			const ensureFillFrame = () => {
				if (!fillFrame) {
					fillLastTime = 0;
					fillFrame = requestAnimationFrame(renderFill);
				}
			};
			const hideFillImmediate = () => {
				fillTarget = null;
				geometryLink = null;
				geometryRects = [];
				geometryBounds = null;
				setFillLayer(null);
				fillVisible = fillCollapsing = false;
				fillCollapseStart = fillLastTime = 0;
				if (fillFrame) {
					cancelAnimationFrame(fillFrame);
					fillFrame = 0;
				}
				linkFill.hidden = true;
			};
			const cursorIdleMs = 2200;
			const cursorIdleHidingEnabled = () => {
				if (cursorMode !== "invert") return false;
				const root = document.documentElement;
				return root.dataset.siteKind === "keybr" || root.dataset.siteKind === "wordle" || root.dataset.siteKind === "blog-post";
			};
			let cursorIdleTimer = 0, cursorIdleDeadline = 0;
			const clearCursorIdle = () => {
				cursorIdleDeadline = 0;
				if (cursorIdleTimer) {
					clearTimeout(cursorIdleTimer);
					cursorIdleTimer = 0;
				}
			};
			const hideCursorVisual = () => setCursorVisible(false);
			const hidePointerVisuals = () => {
				hideCursorVisual();
				hideFillImmediate();
			};
			const runCursorIdle = () => {
				cursorIdleTimer = 0;
				if (!cursorIdleHidingEnabled()) {
					cursorIdleDeadline = 0;
					return;
				}
				if (!cursorIdleDeadline) return;
				const remaining = cursorIdleDeadline - performance.now();
				if (remaining > 1) {
					cursorIdleTimer = window.setTimeout(runCursorIdle, remaining);
					return;
				}
				cursorIdleDeadline = 0;
				if (!nativeDragging && !cursorLoading) hideCursorVisual();
			};
			const armCursorIdle = () => {
				if (!cursorIdleHidingEnabled()) {
					clearCursorIdle();
					return;
				}
				cursorIdleDeadline = performance.now() + cursorIdleMs;
				if (!cursorIdleTimer) cursorIdleTimer = window.setTimeout(runCursorIdle, cursorIdleMs);
			};
			const wakeCursor = () => {
				if (cursorMode !== "invert" || nativeDragging || cursorLoading) return;
				setCursorVisible(true);
				armCursorIdle();
			};
			const syncCursorIdlePolicy = () => {
				if (cursorIdleHidingEnabled()) {
					if (cursorVisible) armCursorIdle();
					return;
				}
				clearCursorIdle();
				if (!hasPointerPosition || nativeDragging || cursorLoading) return;
				setCursorVisible(true);
				refreshCursorMode();
			};
			addEventListener("samey-pageload", syncCursorIdlePolicy);
			addEventListener("samey-solid-routechange", syncCursorIdlePolicy);
			function setFillTarget(link) {
				if (!link) {
					fillTarget = null;
					setFillLayer(null);
					if (!fillVisible) return;
					if (!fillCollapsing) {
						fillCollapsing = true;
						fillCollapseStart = 0;
						fillCollapseFromX = fillX;
						fillCollapseFromY = fillY;
						fillCollapseFromW = fillW;
						fillCollapseFromH = fillH;
					}
					wantedFillX = pendingX;
					wantedFillY = pendingY;
					wantedFillW = wantedFillH = fillDot;
					ensureFillFrame();
					return;
				}
				if (!fillVisible) {
					fillX = wantedFillX = pendingX;
					fillY = wantedFillY = pendingY;
					fillW = fillH = fillDot;
					fillVisible = true;
					linkFill.hidden = false;
				}
				if (fillTarget !== link) refreshLinkGeometry(link);
				fillTarget = link;
				fillCollapsing = false;
				fillCollapseStart = 0;
				linkFill.hidden = false;
				updateFillGoal();
				ensureFillFrame();
			}
			const textInput = (target) => target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement && ![
				"button",
				"checkbox",
				"color",
				"file",
				"hidden",
				"image",
				"radio",
				"range",
				"reset",
				"submit"
			].includes(target.type);
			const wantsText = (target) => {
				if (!(target instanceof Element) || linkTarget(target) || target.closest("button,select,option,summary,[role=button],[role=slider],[role=checkbox],[role=switch],[role=radio],[role=radiogroup],[role=menu],[role=menuitem],[data-grab-cursor],[data-cursor-round]")) return false;
				if (textInput(target) || target.closest("[contenteditable=\"true\"],[contenteditable=\"plaintext-only\"]")) return true;
				if (target.closest("[data-text-cursor-zone]")) return true;
				const style = getComputedStyle(target);
				if (style.userSelect === "none") return false;
				if (style.cursor === "text" || style.cursor === "vertical-text") return true;
				if (!target.textContent?.trim()) return false;
				const pos = document.caretPositionFromPoint?.(pendingX, pendingY);
				const fallback = pos ? null : document.caretRangeFromPoint?.(pendingX, pendingY);
				const node = pos?.offsetNode ?? fallback?.startContainer;
				const caretOffset = pos?.offset ?? fallback?.startOffset;
				if (!(node instanceof Text) || !target.contains(node.parentElement) || !node.data || caretOffset == null) return false;
				const range = document.createRange();
				const offset = Math.max(0, Math.min(node.length - 1, caretOffset === node.length ? caretOffset - 1 : caretOffset));
				range.setStart(node, offset);
				range.setEnd(node, Math.min(node.length, offset + 1));
				const rect = range.getBoundingClientRect();
				return rect.height > 0 && pendingX >= rect.left - 5 && pendingX <= rect.right + 5 && pendingY >= rect.top - 2 && pendingY <= rect.bottom + 2;
			};
			let grabModeTarget = null, grabModeValue = false;
			const wantsGrabCached = (target) => {
				if (target === grabModeTarget) return grabModeValue;
				grabModeTarget = target;
				return grabModeValue = wantsGrab(target);
			};
			const setMode = (target) => {
				const grab = nativeDragging || pressedGrab || !selectingText && wantsGrabCached(target);
				const link = grab || selectingText ? null : linkTarget(target);
				const text = !grab && (selectingText || !link && wantsText(target));
				if (cursorMode !== "invert") {
					if (cursorMode === "hardware") document.documentElement.dataset.sameyCursorShape = grab ? "grab" : text ? "text" : "dot";
					updateBlendSource(link ?? target);
					setFillLayer(link);
					setFillTarget(link);
					return;
				}
				updateBlendSource(link ?? target);
				setFillLayer(link);
				setGrabState(grab);
				setTextState(text);
				setFillTarget(link);
			};
			let pointTextTarget = null, pointTextSensitive = false, pointModeFrame = 0;
			const textModeNeedsPointRefresh = (target) => {
				if (target === pointTextTarget) return pointTextSensitive;
				pointTextTarget = target;
				if (!(target instanceof Element) || linkTarget(target) || target.closest("button,select,option,summary,[role=button],[role=slider],[role=checkbox],[role=switch],[role=radio],[role=radiogroup],[role=menu],[role=menuitem],[data-grab-cursor],[data-cursor-round]")) return pointTextSensitive = false;
				if (textInput(target) || target.closest("[contenteditable=\"true\"],[contenteditable=\"plaintext-only\"],[data-text-cursor-zone]")) return pointTextSensitive = false;
				const style = getComputedStyle(target);
				if (style.userSelect === "none" || style.cursor === "text" || style.cursor === "vertical-text") return pointTextSensitive = false;
				return pointTextSensitive = !!target.textContent?.trim();
			};
			const schedulePointModeRefresh = (target) => {
				if (!textModeNeedsPointRefresh(target) || pointModeFrame) return;
				pointModeFrame = requestAnimationFrame(() => {
					pointModeFrame = 0;
					const actual = document.elementFromPoint(pendingX, pendingY) || pointTextTarget;
					if (actual !== pointTextTarget) {
						pointTextTarget = null;
						textModeNeedsPointRefresh(actual);
					}
					setMode(actual);
				});
			};
			refreshCursorMode = () => cursorMode !== "invert" && hasPointerPosition ? setMode(document.elementFromPoint(pendingX, pendingY)) : cursorVisible ? setMode(document.elementFromPoint(pendingX, pendingY)) : setFillTarget(null);
			const syncCursorPresentation = (theme = read()) => {
				cursorMode = theme.cursorMode;
				document.documentElement.dataset.cursorMode = cursorMode;
				document.documentElement.classList.toggle("samey-custom-cursor", cursorMode === "invert");
				document.documentElement.classList.toggle("samey-hardware-cursor", cursorMode === "hardware");
				document.documentElement.classList.toggle("samey-native-cursor", cursorMode === "native");
				applyHardwareCursorTheme(document.documentElement, theme);
				cursor.hidden = cursorMode !== "invert";
				if (cursorMode !== "invert") setCursorVisible(false);
				if (cursorMode !== "invert" && hasPointerPosition) setMode(document.elementFromPoint(pendingX, pendingY));
				if (cursorMode === "invert" && hasPointerPosition && !nativeDragging) {
					setCursorVisible(true);
					setMode(document.elementFromPoint(pendingX, pendingY));
					armCursorIdle();
				}
			};
			addEventListener("samey-themechange", () => syncCursorPresentation(read()));
			syncCursorPresentation(read());
			const hasRawPointer = "onpointerrawupdate" in window;
			const moveCursorOnly = (event) => {
				if (nativeDragging) return;
				const x = event.clientX, y = event.clientY;
				if (!Number.isFinite(x) || !Number.isFinite(y)) return;
				hasPointerPosition = true;
				lastX = pendingX = x;
				lastY = pendingY = y;
				if (cursorMode !== "invert") return;
				cursor.style.transform = `translate3d(${x - 32}px,${y - 32}px,0)`;
				if (!cursorVisible && !cursorLoading) setCursorVisible(true);
			};
			const moveCursorFallback = (event) => {
				if (nativeDragging) {
					hidePointerVisuals();
					return;
				}
				const x = event.clientX, y = event.clientY;
				if (!Number.isFinite(x) || !Number.isFinite(y)) return;
				if (cursorMode === "invert") {
					if (!hasRawPointer || x !== pendingX || y !== pendingY) place(event);
					wakeCursor();
				} else {
					hasPointerPosition = true;
					lastX = pendingX = x;
					lastY = pendingY = y;
				}
				if (fillTarget) {
					updateFillGoal();
					ensureFillFrame();
				}
				schedulePointModeRefresh(event.target instanceof Element ? event.target : elementAt(event));
			};
			const refreshPointerTarget = (event) => {
				if (cursorMode !== "invert") {
					const x = event.clientX, y = event.clientY;
					if (Number.isFinite(x) && Number.isFinite(y)) {
						hasPointerPosition = true;
						lastX = pendingX = x;
						lastY = pendingY = y;
					}
					const target = event.target instanceof Element ? event.target : elementAt(event);
					pointTextTarget = null;
					textModeNeedsPointRefresh(target);
					setMode(target);
					return;
				}
				if (nativeDragging) {
					hidePointerVisuals();
					return;
				}
				place(event);
				const target = event.target instanceof Element ? event.target : elementAt(event);
				pointTextTarget = null;
				textModeNeedsPointRefresh(target);
				setMode(target);
			};
			if (hasRawPointer) document.addEventListener("pointerrawupdate", moveCursorOnly, {
				capture: true,
				passive: true
			});
			document.addEventListener("pointermove", moveCursorFallback, {
				capture: true,
				passive: true
			});
			document.addEventListener("pointerover", refreshPointerTarget, {
				capture: true,
				passive: true
			});
			addEventListener("scroll", () => {
				if (fillTarget) {
					updateFillGoal(true);
					ensureFillFrame();
				}
			}, {
				passive: true,
				capture: true
			});
			addEventListener("resize", () => {
				if (fillTarget) {
					updateFillGoal(true);
					ensureFillFrame();
				}
			}, { passive: true });
			addEventListener("samey-pageleave", () => setFillTarget(null));
			document.addEventListener("pointerdown", (event) => {
				document.documentElement.style.setProperty("--samey-dialog-origin-x", `${event.clientX}px`);
				document.documentElement.style.setProperty("--samey-dialog-origin-y", `${event.clientY}px`);
				const actual = elementAt(event);
				const pressedLink = linkTarget(actual);
				const modifiedLink = pressedLink && (event.ctrlKey || event.metaKey || event.button === 1);
				pressedPointerId = event.pointerId;
				pressedGrab = !!actual?.closest?.(pressedGrabSelector);
				place(event);
				wakeCursor();
				selectingText = event.button === 0 && !pressedGrab && !pressedLink && wantsText(actual);
				setMode(actual);
				if (modifiedLink) {
					event.preventDefault();
					modifiedLinkPending = pressedLink;
					suppressModifiedClick = pressedLink;
					holdLinkCursor(event, pressedLink);
				}
			}, true);
			document.addEventListener("pointerup", (event) => {
				selectingText = false;
				hideDragPreview();
				if (pressedPointerId === event.pointerId) {
					pressedPointerId = null;
					pressedGrab = false;
				}
				if (modifiedLinkPending instanceof HTMLAnchorElement && modifiedLinkPending.href) {
					const link = modifiedLinkPending;
					modifiedLinkPending = null;
					holdLinkCursor(event, link);
					window.open(link.href, "_blank", "noopener,noreferrer");
				}
				place(event);
				wakeCursor();
				setMode(elementAt(event));
			}, true);
			document.addEventListener("click", (event) => {
				const link = event.button === 0 ? linkTarget(event.target) : null;
				if (!link) return;
				if (suppressModifiedClick === link) {
					event.preventDefault();
					suppressModifiedClick = null;
					return;
				}
				holdLinkCursor(event, link);
			}, true);
			document.addEventListener("auxclick", (event) => {
				const link = event.button === 1 ? linkTarget(event.target) : null;
				if (!link) return;
				if (suppressModifiedClick === link) {
					event.preventDefault();
					suppressModifiedClick = null;
					return;
				}
				event.preventDefault();
				holdLinkCursor(event, link);
				if (link instanceof HTMLAnchorElement && link.href) window.open(link.href, "_blank", "noopener,noreferrer");
			}, true);
			const selectedEditableText = (target) => {
				const editable = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement ? target : target instanceof Element ? target.closest("input,textarea") : null;
				if (!(editable instanceof HTMLInputElement || editable instanceof HTMLTextAreaElement)) return "";
				const start = editable.selectionStart, end = editable.selectionEnd;
				return start != null && end != null && end > start ? editable.value.slice(start, end) : "";
			};
			const setNativeDragImage = (event, kind, text) => {
				if (!event.dataTransfer || !text) return;
				const x = Number.isFinite(event.clientX) && event.clientX ? event.clientX : lastX;
				const y = Number.isFinite(event.clientY) && event.clientY ? event.clientY : lastY;
				showDragPreview(kind, text, x, y);
				event.dataTransfer.setDragImage(dragPreview, Math.round(dragPreviewW / 2), Math.round(dragPreviewH / 2));
				requestAnimationFrame(hideDragPreview);
			};
			const startNativeDrag = (event) => {
				const link = linkTarget(event.target);
				const text = selectedEditableText(event.target) || (!link ? getSelection()?.toString() || "" : "");
				if (link) setNativeDragImage(event, "link", linkDragLabel(link));
				else if (text) setNativeDragImage(event, "text", text);
				nativeDragging = true;
				selectingText = false;
				pressedGrab = false;
				pressedPointerId = null;
				setGrabState(false);
				setTextState(false);
				clearCursorIdle();
				hidePointerVisuals();
			};
			document.addEventListener("dragstart", startNativeDrag, true);
			document.addEventListener("dragenter", () => {
				nativeDragging = true;
				clearCursorIdle();
				hidePointerVisuals();
			}, true);
			document.addEventListener("dragover", () => {
				nativeDragging = true;
				clearCursorIdle();
				hidePointerVisuals();
			}, true);
			const stopDragging = () => {
				nativeDragging = false;
				selectingText = false;
				pressedGrab = false;
				pressedPointerId = null;
				modifiedLinkPending = null;
				suppressModifiedClick = null;
				hideDragPreview();
				setGrabState(false);
				setTextState(false);
				hidePointerVisuals();
			};
			document.addEventListener("dragend", stopDragging, true);
			document.addEventListener("drop", stopDragging, true);
			addEventListener("pointercancel", stopDragging, true);
			addEventListener("blur", stopDragging);
			addEventListener("pointerout", (event) => {
				if (!event.relatedTarget && !nativeDragging && performance.now() >= linkHandoffUntil) {
					clearCursorIdle();
					hidePointerVisuals();
				}
			});
		};
		const editableTarget = (el) => {
			if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return el;
			return el instanceof Element ? el.closest("[contenteditable=\"true\"], [contenteditable=\"plaintext-only\"]") : null;
		};
		const selectedText = () => getSelection()?.toString() || "";
		const writeClipboard = async (text) => {
			if (!text) return;
			try {
				await navigator.clipboard.writeText(text);
			} catch {
				const area = document.createElement("textarea");
				area.value = text;
				area.style.cssText = "position:fixed;opacity:0;pointer-events:none";
				document.body.append(area);
				try {
					area.select();
					document.execCommand("copy");
				} finally {
					area.remove();
				}
			}
		};
		const pasteInto = (el, text) => {
			if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
				el.setRangeText(text, el.selectionStart ?? el.value.length, el.selectionEnd ?? el.value.length, "end");
				el.dispatchEvent(new InputEvent("input", {
					bubbles: true,
					inputType: "insertFromPaste",
					data: text
				}));
			} else if (el?.isContentEditable) {
				el.focus();
				document.execCommand("insertText", false, text);
			}
		};
		const linkCopyText = (link) => {
			if (!(link instanceof HTMLAnchorElement)) return "";
			const explicit = link.dataset.copyLabel?.trim();
			if (explicit) return explicit;
			const labelled = link.getAttribute("aria-label")?.trim() || link.title?.trim();
			if (labelled) return labelled.replace(/^(Open|Go to|Visit)\s+/i, "").replace(/\s+(source repository)$/i, " source");
			const named = link.querySelector(".project-name,.oss-name,.blog-name,.brand")?.textContent?.trim();
			if (named) return named;
			try {
				const url = new URL(link.href, location.href);
				return decodeURIComponent(url.pathname.split("/").filter(Boolean).pop() || url.hostname.replace(/^www\./, "")).replace(/\.html?$/i, "").replace(/[-_]+/g, " ") || url.hostname;
			} catch {
				return "Link";
			}
		};
		const stampLinkCopyLabels = (root = document) => {
			const links = root instanceof HTMLAnchorElement ? [root] : root.querySelectorAll("a[href]");
			for (const link of links) if (!link.dataset.copyLabel) link.dataset.copyLabel = linkCopyText(link);
		};
		stampLinkCopyLabels();
		new MutationObserver((records) => {
			for (const record of records) for (const node of record.addedNodes) if (node instanceof Element && !node.closest?.(".monaco-host, .monaco-editor, .monaco-diff-editor")) stampLinkCopyLabels(node);
		}).observe(document.documentElement, {
			childList: true,
			subtree: true
		});
		const mountContextMenu = () => {
			if (document.getElementById("samey-context-menu")) return;
			const menu = runtimeNode(document.createElement("div"));
			menu.id = "samey-context-menu";
			menu.className = "samey-context-menu";
			menu.dataset.sameyOverlayBlocker = "";
			menu.hidden = true;
			document.body.append(menu);
			let target = null;
			const close = () => {
				menu.hidden = true;
				menu.replaceChildren();
			};
			const add = (label, action, enabled = true, hint = "") => {
				const button = document.createElement("button");
				button.type = "button";
				button.disabled = !enabled;
				const text = document.createElement("span");
				text.textContent = label;
				button.append(text);
				if (hint) {
					const key = document.createElement("kbd");
					key.textContent = hint;
					button.append(key);
				}
				button.addEventListener("click", async () => {
					close();
					try {
						await action();
					} catch {}
				});
				menu.append(button);
			};
			const sep = () => {
				const hr = document.createElement("hr");
				menu.append(hr);
			};
			document.addEventListener("contextmenu", (event) => {
				if (event.shiftKey) return;
				event.preventDefault();
				target = event.target;
				menu.replaceChildren();
				const link = target instanceof Element ? target.closest("a[href]") : null;
				const image = target instanceof Element ? target.closest("img[src]") : null;
				const selection = selectedText();
				const editable = editableTarget(target);
				if (selection) add("Copy", () => writeClipboard(selection), true, navigator.platform?.includes("Mac") ? "⌘C" : "Ctrl+C");
				if (editable && selection) add("Cut", async () => {
					await writeClipboard(selection);
					document.execCommand("delete");
				}, true, navigator.platform?.includes("Mac") ? "⌘X" : "Ctrl+X");
				if (editable) add("Paste", async () => pasteInto(editable, await navigator.clipboard.readText()), !!navigator.clipboard?.readText, navigator.platform?.includes("Mac") ? "⌘V" : "Ctrl+V");
				add("Select all", () => {
					if (editable instanceof HTMLInputElement || editable instanceof HTMLTextAreaElement) {
						editable.focus();
						editable.select();
					} else if (editable) {
						const range = document.createRange();
						range.selectNodeContents(editable);
						const sel = getSelection();
						if (sel) {
							sel.removeAllRanges();
							sel.addRange(range);
						}
					} else {
						const range = document.createRange();
						range.selectNodeContents(document.body);
						const sel = getSelection();
						if (sel) {
							sel.removeAllRanges();
							sel.addRange(range);
						}
					}
				}, true, navigator.platform?.includes("Mac") ? "⌘A" : "Ctrl+A");
				if (selection && !editable) {
					sep();
					add("Search web for selection", () => open(`https://www.google.com/search?q=${encodeURIComponent(selection)}`, "_blank", "noopener"));
				}
				if (link || image) {
					sep();
					if (link) {
						add("Open link in new tab", () => open(link.href, "_blank", "noopener"));
						add("Copy link", () => writeClipboard(link.href));
						add("Copy Markdown link", () => writeClipboard(`[${linkCopyText(link)}](${link.href})`));
					}
					if (image) {
						add("Open image in new tab", () => open(image.src, "_blank", "noopener"));
						add("Copy image address", () => writeClipboard(image.src));
						add("Save image", () => {
							const a = document.createElement("a");
							a.href = image.src;
							a.download = image.alt || "image";
							a.click();
						});
					}
				}
				sep();
				add("Back", () => history.back(), history.length > 1);
				add("Forward", () => history.forward());
				add("Reload", () => location.reload(), true, navigator.platform?.includes("Mac") ? "⌘R" : "Ctrl+R");
				add("Copy page link", () => writeClipboard(location.href));
				add("Copy page title", () => writeClipboard(document.title));
				add("Print…", () => print(), true, navigator.platform?.includes("Mac") ? "⌘P" : "Ctrl+P");
				if (document.fullscreenEnabled) add(document.fullscreenElement ? "Exit fullscreen" : "Fullscreen", () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen());
				menu.hidden = false;
				const rect = menu.getBoundingClientRect();
				menu.style.left = `${Math.max(8, Math.min(event.clientX, innerWidth - rect.width - 8))}px`;
				menu.style.top = `${Math.max(8, Math.min(event.clientY, innerHeight - rect.height - 8))}px`;
			}, true);
			document.addEventListener("pointerdown", (event) => {
				if (!menu.hidden && event.target instanceof Node && !menu.contains(event.target)) close();
			}, true);
			addEventListener("blur", close);
			addEventListener("resize", close);
			addEventListener("scroll", close, true);
			document.addEventListener("keydown", (event) => {
				if (event.key === "Escape") close();
			});
		};
		const virtualBars = /* @__PURE__ */ new Map();
		let virtualRaf = 0;
		const scrollMetrics = (target) => target === document.scrollingElement ? {
			top: scrollY,
			size: innerHeight,
			total: target.scrollHeight
		} : {
			top: target.scrollTop,
			size: target.clientHeight,
			total: target.scrollHeight
		};
		const setScroll = (target, top) => target === document.scrollingElement ? scrollTo({ top }) : target.scrollTop = top;
		const virtualScrollerOptOut = (target) => !!target.closest("[data-samey-runtime], .monaco-host, .monaco-editor, .monaco-diff-editor, [data-samey-native-scrollbars]");
		const virtualScrollerEligible = (target) => {
			if (!target) return false;
			if (target === document.scrollingElement) return true;
			if (!target.isConnected || virtualScrollerOptOut(target)) return false;
			const style = getComputedStyle(target);
			if (style.display === "none" || style.visibility === "hidden" || Number.parseFloat(style.opacity || "1") <= .001) return false;
			const rect = target.getBoundingClientRect();
			if (rect.width < 8 || rect.height < 8 || style.pointerEvents === "none") return false;
			return true;
		};
		const updateVirtualBars = () => {
			virtualRaf = 0;
			for (const [target, bar] of virtualBars) {
				if (!virtualScrollerEligible(target)) {
					bar.remove();
					virtualBars.delete(target);
					continue;
				}
				const { top, size, total } = scrollMetrics(target);
				if (total <= size + 2) {
					bar.hidden = true;
					continue;
				}
				bar.hidden = false;
				let height, x, topPx;
				if (target === document.scrollingElement) {
					height = innerHeight;
					x = innerWidth - 7;
					topPx = 0;
				} else {
					const rect = target.getBoundingClientRect();
					height = Math.max(18, rect.height);
					x = rect.right - 7;
					topPx = rect.top;
					if (rect.bottom < 0 || rect.top > innerHeight || rect.right < 0 || rect.left > innerWidth) {
						bar.hidden = true;
						continue;
					}
				}
				bar.style.cssText = `height:${height}px;left:${x}px;top:${topPx}px`;
				const thumb = bar.firstElementChild;
				if (!(thumb instanceof HTMLElement)) continue;
				const thumbH = Math.max(24, height * size / total);
				const y = (height - thumbH) * top / Math.max(1, total - size);
				thumb.style.height = `${thumbH}px`;
				thumb.style.transform = `translateY(${y}px)`;
			}
			updateVirtualXBars();
		};
		const scheduleVirtualBars = () => {
			if (!virtualRaf) virtualRaf = requestAnimationFrame(updateVirtualBars);
		};
		const addVirtualBar = (target) => {
			if (virtualBars.has(target)) return;
			const bar = runtimeNode(document.createElement("div"));
			bar.className = "samey-vscroll";
			const thumb = document.createElement("div");
			thumb.className = "samey-vscroll-thumb";
			thumb.dataset.grabCursor = "";
			bar.append(thumb);
			document.body.append(bar);
			let startY = 0, startTop = 0;
			thumb.addEventListener("pointerdown", (event) => {
				event.preventDefault();
				thumb.setPointerCapture(event.pointerId);
				startY = event.clientY;
				startTop = scrollMetrics(target).top;
			});
			thumb.addEventListener("pointermove", (event) => {
				if (!thumb.hasPointerCapture(event.pointerId)) return;
				const { size, total } = scrollMetrics(target);
				const track = bar.clientHeight, thumbH = thumb.clientHeight;
				setScroll(target, startTop + (event.clientY - startY) * Math.max(1, total - size) / Math.max(1, track - thumbH));
				scheduleVirtualBars();
			});
			bar.addEventListener("pointerdown", (event) => {
				if (event.target === thumb) return;
				const { size, total } = scrollMetrics(target);
				const rect = bar.getBoundingClientRect();
				setScroll(target, (event.clientY - rect.top) / rect.height * Math.max(0, total - size));
				scheduleVirtualBars();
			});
			target.addEventListener("scroll", scheduleVirtualBars, { passive: true });
			virtualBars.set(target, bar);
		};
		const virtualXBars = /* @__PURE__ */ new Map();
		const addVirtualXBar = (target) => {
			if (virtualXBars.has(target)) return;
			const bar = runtimeNode(document.createElement("div"));
			bar.className = "samey-hscroll";
			const thumb = document.createElement("div");
			thumb.className = "samey-hscroll-thumb";
			thumb.dataset.grabCursor = "";
			bar.append(thumb);
			document.body.append(bar);
			let startX = 0, startLeft = 0;
			thumb.addEventListener("pointerdown", (event) => {
				event.preventDefault();
				thumb.setPointerCapture(event.pointerId);
				startX = event.clientX;
				startLeft = target.scrollLeft;
			});
			thumb.addEventListener("pointermove", (event) => {
				if (!thumb.hasPointerCapture(event.pointerId)) return;
				const size = target.clientWidth, total = target.scrollWidth, track = bar.clientWidth, thumbW = thumb.clientWidth;
				target.scrollLeft = startLeft + (event.clientX - startX) * Math.max(1, total - size) / Math.max(1, track - thumbW);
				scheduleVirtualBars();
			});
			bar.addEventListener("pointerdown", (event) => {
				if (event.target === thumb) return;
				const rect = bar.getBoundingClientRect();
				target.scrollLeft = (event.clientX - rect.left) / rect.width * Math.max(0, target.scrollWidth - target.clientWidth);
				scheduleVirtualBars();
			});
			target.addEventListener("scroll", scheduleVirtualBars, { passive: true });
			virtualXBars.set(target, bar);
		};
		const updateVirtualXBars = () => {
			for (const [target, bar] of virtualXBars) {
				if (!virtualScrollerEligible(target)) {
					bar.remove();
					virtualXBars.delete(target);
					continue;
				}
				if (target.scrollWidth <= target.clientWidth + 2) {
					bar.hidden = true;
					continue;
				}
				const rect = target.getBoundingClientRect();
				if (rect.bottom < 0 || rect.top > innerHeight || rect.right < 0 || rect.left > innerWidth) {
					bar.hidden = true;
					continue;
				}
				bar.hidden = false;
				const width = Math.max(18, rect.width);
				bar.style.cssText = `width:${width}px;left:${rect.left}px;top:${rect.bottom - 7}px`;
				const thumb = bar.firstElementChild;
				if (!(thumb instanceof HTMLElement)) continue;
				const thumbW = Math.max(24, width * target.clientWidth / target.scrollWidth);
				const x = (width - thumbW) * target.scrollLeft / Math.max(1, target.scrollWidth - target.clientWidth);
				thumb.style.width = `${thumbW}px`;
				thumb.style.transform = `translateX(${x}px)`;
			}
		};
		const considerVirtualScroller = (el) => {
			if (!virtualScrollerEligible(el)) return;
			const style = getComputedStyle(el);
			if ((style.overflowY === "auto" || style.overflowY === "scroll") && el.scrollHeight > el.clientHeight + 2) addVirtualBar(el);
			if ((style.overflowX === "auto" || style.overflowX === "scroll") && el.scrollWidth > el.clientWidth + 2) addVirtualXBar(el);
		};
		const scanVirtualScrollers = () => {
			const root = document.scrollingElement;
			if (root) addVirtualBar(root);
			for (const el of document.querySelectorAll("body *:not([data-samey-runtime])")) considerVirtualScroller(el);
			scheduleVirtualBars();
		};
		const mountVirtualScrollbars = () => {
			scanVirtualScrollers();
			let scanRaf = 0;
			const pending = /* @__PURE__ */ new Set();
			const scheduleTargets = (targets) => {
				for (const target of targets) if (target instanceof Element && !virtualScrollerOptOut(target)) pending.add(target);
				if (scanRaf || !pending.size) return;
				scanRaf = requestAnimationFrame(() => {
					scanRaf = 0;
					for (const target of pending) {
						considerVirtualScroller(target);
						for (const el of target.querySelectorAll("*:not([data-samey-runtime])")) considerVirtualScroller(el);
					}
					pending.clear();
					scheduleVirtualBars();
				});
			};
			new MutationObserver((records) => {
				const targets = [];
				for (const record of records) {
					targets.push(record.target);
					for (const node of record.addedNodes) targets.push(node instanceof Element ? node : node.parentElement);
				}
				scheduleTargets(targets);
			}).observe(document.body, {
				subtree: true,
				childList: true
			});
			new ResizeObserver(() => {
				scheduleVirtualBars();
				scheduleTargets([document.body]);
			}).observe(document.documentElement);
			addEventListener("resize", () => {
				scheduleVirtualBars();
				scheduleTargets([document.body]);
			});
			addEventListener("scroll", scheduleVirtualBars, true);
		};
		const hashTarget = (url) => {
			if (!url.hash) return "";
			try {
				return decodeURIComponent(url.hash.slice(1));
			} catch {
				return url.hash.slice(1);
			}
		};
		const pageStyleNodes = () => [...document.head.querySelectorAll("style:not([data-samey-shared]),link[rel=\"stylesheet\"]:not([data-samey-shared])")];
		const markInitialPageStyles = () => pageStyleNodes().forEach((el) => {
			el.dataset.spaPage = "";
		});
		const pageCache = /* @__PURE__ */ new Map();
		const setLoading = (value) => {
			globalThis.SameyLoading?.(value);
			document.getElementById("samey-loading-layer")?.removeAttribute("data-visible");
		};
		const syncHtmlData = (doc, baseUrl) => {
			const keep = /* @__PURE__ */ new Set([
				"data-site-theme",
				"data-kb-theme",
				"data-font",
				"data-color"
			]);
			for (const attr of [...document.documentElement.attributes]) if (attr.name.startsWith("data-") && !keep.has(attr.name)) document.documentElement.removeAttribute(attr.name);
			for (const attr of doc.documentElement.attributes) if (attr.name.startsWith("data-")) {
				let value = attr.value;
				if ((attr.name === "data-home-href" || attr.name === "data-back-href") && value) value = new URL(value, baseUrl).href;
				document.documentElement.setAttribute(attr.name, value);
			}
		};
		const logicalPageUrl = (url) => {
			const logical = new URL(url.href);
			if (logical.pathname.endsWith("/blog")) logical.pathname += "/index.html";
			else if (logical.pathname.endsWith("/")) logical.pathname += "index.html";
			else if (!/\.[a-z0-9]+$/i.test(logical.pathname)) logical.pathname += ".html";
			return logical;
		};
		const fetchPage = async (url) => {
			const key = url.href;
			const cached = pageCache.get(key);
			if (cached) return cached;
			const task = (async () => {
				const logical = logicalPageUrl(url);
				const response = await fetch(logical, { headers: { "X-Samey-SPA": "1" } });
				if (!response.ok) throw new Error("page fetch failed");
				const doc = new DOMParser().parseFromString(await response.text(), "text/html");
				const baseTag = doc.querySelector("base[href]")?.getAttribute("href");
				return {
					doc,
					baseUrl: new URL(baseTag || ".", logical.href),
					responseUrl: logical.href
				};
			})();
			pageCache.set(key, task);
			try {
				return await task;
			} catch (error) {
				pageCache.delete(key);
				throw error;
			}
		};
		const normalizePageUrls = (doc, baseUrl) => {
			for (const el of doc.querySelectorAll("[href]")) {
				const value = el.getAttribute("href");
				if (!value || value.startsWith("#") || /^(?:mailto:|tel:|javascript:|data:)/i.test(value)) continue;
				try {
					el.setAttribute("href", new URL(value, baseUrl).href);
				} catch {}
			}
			for (const el of doc.querySelectorAll("[src]")) {
				const value = el.getAttribute("src");
				if (!value || /^(?:data:|blob:)/i.test(value)) continue;
				try {
					el.setAttribute("src", new URL(value, baseUrl).href);
				} catch {}
			}
		};
		const runBodyScripts = (baseUrl) => {
			for (const old of [...document.body.querySelectorAll("script")]) {
				const fresh = document.createElement("script");
				for (const attr of old.attributes) if (attr.name !== "src") fresh.setAttribute(attr.name, attr.value);
				const source = old.getAttribute("src");
				if (source) fresh.src = new URL(source, baseUrl).href;
				else fresh.textContent = old.textContent;
				old.replaceWith(fresh);
			}
		};
		const runHeadScripts = (doc, baseUrl) => {
			document.head.querySelectorAll("script[data-spa-page-script]").forEach((script) => script.remove());
			for (const old of [...doc.head.querySelectorAll("script")]) {
				const source = old.getAttribute("src");
				const resolved = source ? new URL(source, baseUrl).href : "";
				if (resolved && /\/shared-runtime\.js(?:[?#]|$)/.test(resolved)) continue;
				const fresh = document.createElement("script");
				for (const attr of old.attributes) if (attr.name !== "src") fresh.setAttribute(attr.name, attr.value);
				fresh.dataset.spaPageScript = "";
				if (resolved) fresh.src = resolved;
				else fresh.textContent = old.textContent;
				document.head.append(fresh);
			}
		};
		const clearPageBody = () => {
			const runtimeAnchor = document.body.querySelector("[data-samey-runtime]");
			for (const child of [...document.body.children]) if (!child.hasAttribute("data-samey-runtime")) child.remove();
			return runtimeAnchor;
		};
		let currentPagePath = location.pathname;
		const swapPage = (doc, baseUrl, url, replace) => {
			try {
				globalThis.SameyToolsDispose?.();
				delete globalThis.SameyToolsDispose;
			} catch {}
			try {
				globalThis.SameySolidDispose?.();
			} catch {}
			try {
				globalThis.SameyWordleDispose?.();
			} catch {}
			try {
				globalThis.SameyKeybrDispose?.();
			} catch {}
			dispatchEvent(new Event("samey-pageleave"));
			normalizePageUrls(doc, baseUrl);
			document.querySelectorAll("head > [data-spa-page]").forEach((el) => el.remove());
			for (const el of [...doc.head.querySelectorAll("style,link[rel=\"stylesheet\"]")]) {
				const copy = el.cloneNode(true);
				if (!(copy instanceof HTMLStyleElement || copy instanceof HTMLLinkElement)) continue;
				copy.dataset.spaPage = "";
				if (copy instanceof HTMLLinkElement && el instanceof HTMLLinkElement) {
					const href = el.getAttribute("href");
					if (href) copy.href = new URL(href, baseUrl).href;
				}
				document.head.append(copy);
			}
			const runtimeAnchor = clearPageBody();
			for (const child of [...doc.body.children]) document.body.insertBefore(document.importNode(child, true), runtimeAnchor);
			document.title = doc.title;
			syncHtmlData(doc, baseUrl);
			currentPagePath = url.pathname;
			writePageHistory(url, replace);
			runBodyScripts(baseUrl);
			runHeadScripts(doc, baseUrl);
			queueMicrotask(() => globalThis.SameyMountSolid?.());
			apply();
			scanVirtualScrollers();
			if (!url.hash) scrollTo({
				top: 0,
				left: 0,
				behavior: "instant"
			});
			else queueMicrotask(() => document.getElementById(hashTarget(url))?.scrollIntoView());
			dispatchEvent(new CustomEvent("samey-pageload", { detail: { url: url.href } }));
		};
		const destinationRoot = () => {
			if (document.documentElement.dataset.siteKind === "keybr") return document.getElementById("app");
			if (document.documentElement.hasAttribute("data-static-article")) return document.querySelector(".article-route");
			return document.querySelector("#solid-site-app,[data-wordle-root],.site-route,.article-route");
		};
		const waitForDestinationRoot = async () => {
			for (let i = 0; i < 90; i++) {
				const root = destinationRoot();
				if (root && root.childElementCount > 0) return root;
				await new Promise((resolve) => requestAnimationFrame(() => resolve()));
			}
			throw new Error(`The ${document.documentElement.dataset.siteKind || "destination"} application did not mount.`);
		};
		const dismissLoadError = () => document.getElementById("samey-load-error")?.remove();
		const showLoadError = (url, error, retry) => {
			dismissLoadError();
			const panel = runtimeNode(document.createElement("aside"));
			panel.id = "samey-load-error";
			panel.className = "samey-load-error";
			panel.setAttribute("role", "alert");
			const message = error instanceof Error ? error.message : "The page could not be loaded.";
			panel.innerHTML = `<div><strong>Page failed to load</strong><span></span></div><div class="samey-load-error-actions"><button type="button" data-retry>Retry</button><a>Open normally</a><button type="button" data-dismiss>Dismiss</button></div>`;
			const messageNode = panel.querySelector("span");
			const normal = panel.querySelector("a");
			const retryButton = panel.querySelector("[data-retry]");
			const dismissButton = panel.querySelector("[data-dismiss]");
			if (messageNode) messageNode.textContent = message;
			if (normal) normal.href = url.href;
			retryButton?.addEventListener("click", () => {
				dismissLoadError();
				retry();
			});
			dismissButton?.addEventListener("click", dismissLoadError);
			document.body.append(panel);
		};
		let pageNavigationId = 0;
		const cancelPageNavigation = () => {
			pageNavigationId++;
			setLoading(false);
		};
		globalThis.SameyCancelPageSwap = cancelPageNavigation;
		const loadPage = async (href, { replace = false, force = false, direction } = {}) => {
			const id = ++pageNavigationId;
			const url = new URL(href, location.href);
			if (url.origin !== location.origin) {
				location.href = url.href;
				return;
			}
			dismissLoadError();
			if (!force && url.href === location.href) {
				setLoading(false);
				return;
			}
			setLoading(true);
			try {
				const { doc, baseUrl } = await fetchPage(url);
				if (id !== pageNavigationId) return;
				const current = destinationRoot();
				const commit = async () => {
					swapPage(doc, baseUrl, url, replace);
					await waitForDestinationRoot();
					document.getElementById("samey-boot")?.remove();
					document.getElementById("samey-boot-style")?.remove();
				};
				const swapDirection = direction ?? (url.pathname === "/" || /\/index(?:\.html)?$/.test(url.pathname) ? "back" : "forward");
				await animateRootSwap(current, commit, destinationRoot, swapDirection);
			} catch (error) {
				if (id !== pageNavigationId) return;
				showLoadError(url, error, () => loadPage(url.href, {
					replace,
					force
				}));
				throw error;
			} finally {
				if (id === pageNavigationId) setLoading(false);
			}
		};
		globalThis.SameyPageSwapNavigate = (href, opts) => loadPage(href, opts);
		globalThis.SameyAnimateLocalSwap = (root, commit, direction = "forward") => animateRootSwap(root, commit, () => root, direction);
		const shouldSpa = (url) => url.origin === location.origin;
		const prefetch = (href) => {
			const url = new URL(href, location.href);
			if (!shouldSpa(url)) return;
			fetchPage(url).catch(() => {});
		};
		globalThis.SameyPreloadPage = prefetch;
		let documentNavigationMounted = false;
		const mountSpa = () => {
			if (document.documentElement.hasAttribute("data-solid-spa")) return;
			globalThis.SameyNavigate = (href, opts) => loadPage(href, opts);
			if (documentNavigationMounted) return;
			documentNavigationMounted = true;
			document.addEventListener("pointerover", (event) => {
				if (document.documentElement.hasAttribute("data-solid-spa")) return;
				const link = eventElement(event)?.closest("a[href]");
				if (link && !link.target) prefetch(link.href);
			}, { passive: true });
			document.addEventListener("focusin", (event) => {
				if (document.documentElement.hasAttribute("data-solid-spa")) return;
				const link = eventElement(event)?.closest("a[href]");
				if (link && !link.target) prefetch(link.href);
			});
			document.addEventListener("click", (event) => {
				if (document.documentElement.hasAttribute("data-solid-spa")) return;
				if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
				const link = eventElement(event)?.closest("a[href]");
				if (!link || link.target || link.hasAttribute("download")) return;
				const url = new URL(link.href, location.href);
				if (!shouldSpa(url) || url.hash && url.pathname === location.pathname && url.search === location.search) return;
				event.preventDefault();
				const direction = link.dataset.navDirection === "back" || url.pathname === "/" ? "back" : "forward";
				loadPage(url.href, { direction }).catch(() => {});
			});
			addEventListener("popstate", () => {
				if (document.documentElement.hasAttribute("data-solid-spa") || location.pathname === currentPagePath) return;
				const previousIndex = pageHistoryIndex;
				const nextIndex = readNavigationIndex();
				const direction = nextIndex != null && nextIndex < previousIndex ? "back" : "forward";
				if (nextIndex != null) pageHistoryIndex = nextIndex;
				loadPage(location.href, {
					replace: true,
					force: true,
					direction
				}).catch(() => {});
			});
		};
		addEventListener("storage", (event) => {
			if (event.key === KEY || event.key === FONT_KEY) apply();
		});
		matchMedia?.("(prefers-color-scheme: dark)").addEventListener?.("change", () => {
			const raw = rawPrefs();
			if (!raw.color || raw.color === "system") apply();
		});
		apply();
		const mountSmoothSliderMotion = () => {
			let active = null;
			let frame = 0;
			let snapTimer = 0;
			const sliderParts = (target) => {
				if (!(target instanceof Element)) return null;
				const root = target.closest(".game-settings-slider");
				if (!root) return null;
				const native = root.querySelector("input[type=\"range\"]");
				const thumb = root.querySelector("[role=\"slider\"]");
				const track = native?.closest(".game-range-shell") ?? root.querySelector("[data-kb-slider-track],.samey-slider-track");
				const hit = target.closest("input[type=\"range\"],[role=\"slider\"],.game-range-shell,[data-kb-slider-track],.samey-slider-track");
				if (!hit || !root.contains(hit) || !track || !native && !thumb) return null;
				return {
					root,
					native,
					thumb,
					track
				};
			};
			const clamp01 = (value) => Math.max(0, Math.min(1, value));
			const actualRatio = (parts) => {
				if (parts.native) {
					const min = Number(parts.native.min || 0), max = Number(parts.native.max || 100), value = Number(parts.native.value);
					return max > min ? clamp01((value - min) / (max - min)) : 0;
				}
				const min = Number(parts.thumb?.getAttribute("aria-valuemin") ?? 0);
				const max = Number(parts.thumb?.getAttribute("aria-valuemax") ?? 100);
				const value = Number(parts.thumb?.getAttribute("aria-valuenow") ?? min);
				return max > min ? clamp01((value - min) / (max - min)) : 0;
			};
			const paintDrag = () => {
				frame = 0;
				const current = active;
				if (!current?.root.isConnected) return;
				const rect = current.track.getBoundingClientRect();
				if (!(rect.width > 0)) return;
				const nativeInset = current.native ? 8 : 0;
				const usable = Math.max(1, rect.width - nativeInset * 2);
				const x = Math.max(rect.left + nativeInset, Math.min(rect.right - nativeInset, current.clientX));
				const pointerRatio = clamp01((x - rect.left - nativeInset) / usable);
				const currentRatio = actualRatio(current);
				current.root.style.setProperty("--samey-slider-drag-offset", `${(pointerRatio - currentRatio) * usable}px`);
				current.root.style.setProperty("--samey-slider-drag-fill", `${nativeInset + pointerRatio * usable}px`);
			};
			const queuePaint = () => {
				if (!frame) frame = requestAnimationFrame(paintDrag);
			};
			const clearRoot = (root) => {
				root.removeAttribute("data-samey-slider-dragging");
				root.removeAttribute("data-samey-slider-snapping");
				root.style.removeProperty("--samey-slider-drag-offset");
				root.style.removeProperty("--samey-slider-drag-fill");
			};
			const release = (pointerId) => {
				if (!active || active.pointerId !== pointerId) return;
				if (frame) {
					cancelAnimationFrame(frame);
					frame = 0;
					paintDrag();
				}
				const root = active.root;
				active = null;
				root.setAttribute("data-samey-slider-snapping", "");
				root.removeAttribute("data-samey-slider-dragging");
				clearTimeout(snapTimer);
				snapTimer = window.setTimeout(() => clearRoot(root), 150);
			};
			document.addEventListener("pointerdown", (event) => {
				if (event.button !== 0) return;
				const parts = sliderParts(event.target);
				if (!parts || parts.native?.disabled || parts.thumb?.getAttribute("aria-disabled") === "true") return;
				if (active) clearRoot(active.root);
				clearTimeout(snapTimer);
				active = {
					...parts,
					pointerId: event.pointerId,
					clientX: event.clientX
				};
				parts.root.removeAttribute("data-samey-slider-snapping");
				parts.root.setAttribute("data-samey-slider-dragging", "");
				queuePaint();
			}, true);
			document.addEventListener("pointermove", (event) => {
				if (!active || event.pointerId !== active.pointerId) return;
				active.clientX = event.clientX;
				queuePaint();
			}, true);
			document.addEventListener("pointerup", (event) => release(event.pointerId), true);
			document.addEventListener("pointercancel", (event) => release(event.pointerId), true);
			addEventListener("samey-pageleave", () => {
				if (frame) cancelAnimationFrame(frame);
				frame = 0;
				if (active) clearRoot(active.root);
				active = null;
			});
		};
		const mountRuntime = () => {
			if (readNavigationIndex() == null) replaceState({
				...history.state || {},
				[NAV_INDEX_KEY]: pageHistoryIndex
			}, "", location.href);
			normalizeExternalLinks();
			observeExternalLinks();
			mountControls();
			mountLoadingBar();
			mountCursor();
			mountContextMenu();
			mountVirtualScrollbars();
			mountSmoothSliderMotion();
			if (!document.documentElement.hasAttribute("data-solid-spa")) markInitialPageStyles();
			mountSpa();
			addEventListener("samey-pageload", mountSpa);
		};
		if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mountRuntime, { once: true });
		else mountRuntime();
		if ("serviceWorker" in navigator && location.protocol !== "file:") {
			const serviceWorkerUrl = new URL("sw.js", SCRIPT_ROOT);
			if (BUILD_VERSION) serviceWorkerUrl.searchParams.set("v", BUILD_VERSION);
			navigator.serviceWorker.register(serviceWorkerUrl.href, { updateViaCache: "none" }).catch(() => {});
		}
	})();
	//#endregion
	//#region src/shared/catalog.ts
	var TOOLS = [
		{
			id: "text",
			label: "Text",
			title: "Text Inspector",
			note: "Word count and non-ASCII character detection."
		},
		{
			id: "base",
			label: "Encode",
			title: "Encode / Decode",
			note: "Base64, URL, Base32, Base58, hex, binary and text encodings."
		},
		{
			id: "diff",
			label: "Diff",
			title: "Live Diff",
			note: "Fast live text diff with inline change highlighting."
		},
		{
			id: "number",
			label: "Numbers",
			title: "Number Lab",
			note: "Inspect and convert integers across bases 2–62."
		},
		{
			id: "markdown",
			label: "Markdown",
			title: "Markdown",
			note: "Live local Markdown editor and preview."
		}
	];
	//#endregion
	//#region src/site/data.ts
	var games = [
		{
			title: "Wordle",
			href: "/wordle.html",
			kind: "Game",
			note: "A Wordle clone.",
			tags: ["solidjs", "word game"]
		},
		{
			title: "Keybr",
			href: "/keybr.html",
			kind: "Game",
			note: "A local-first fork of keybr.com.",
			tags: ["typing", "local-first"]
		},
		{
			title: "Chain Reaction",
			href: "/chain/",
			kind: "Game",
			note: "Chain reaction clone with local AI.",
			tags: [
				"canvas",
				"game",
				"ai"
			]
		}
	];
	var tools = TOOLS.map((tool) => ({
		title: tool.title,
		href: `/tools/?tool=${tool.id}`,
		kind: "Tool",
		note: tool.note
	}));
	var projects = [{
		title: "Reverb",
		href: "/projects/reverb/",
		kind: "Project",
		note: "Android recorder that keeps a rolling audio window in memory.",
		tags: [
			"kotlin",
			"android",
			"audio"
		],
		demo: true
	}, {
		title: "CNN",
		href: "/projects/cnn/",
		kind: "Project",
		note: "CNN in Zig. Draw something and run the model in-browser with WASM.",
		tags: [
			"python / zig",
			"ml",
			"mnist"
		],
		demo: true
	}];
	var posts = [{
		title: "btop's broken lock",
		href: "/blog/posts/btop-mutex.html",
		kind: "Writing",
		note: "the mutex that wasn't",
		tags: [
			"c++",
			"concurrency",
			"btop"
		]
	}];
	var contributions = [
		{
			title: "aristocratos/btop · PR #1649",
			href: "https://github.com/aristocratos/btop/pull/1649",
			kind: "OSS",
			note: "Data races, mutex-like locking and signal-safety fixes.",
			tags: ["c++", "concurrency"]
		},
		{
			title: "karlseguin/http.zig",
			href: "https://github.com/karlseguin/http.zig",
			kind: "OSS",
			note: "Memory leak fixes, CORS performance and Zig build updates.",
			tags: ["zig", "http"]
		},
		{
			title: "gofiber/fiber",
			href: "https://github.com/gofiber/fiber",
			kind: "OSS",
			note: "Route parameter binding and request-context lifecycle fixes.",
			tags: ["go", "http"]
		}
	];
	var searchIndex = [
		...games,
		...tools,
		...posts,
		...projects,
		...contributions,
		{
			title: "Home",
			href: "/",
			kind: "Page",
			note: "Games, tools and writing."
		},
		{
			title: "Work",
			href: "/work/",
			kind: "Page",
			note: "Projects and open-source contributions."
		}
	];
	//#endregion
	//#region src/shared/site.ts
	var nav = navigator;
	var currentScript = document.currentScript;
	var SCRIPT_ROOT = new URL(".", currentScript instanceof HTMLScriptElement ? currentScript.src : location.href);
	var norm = (value) => value.toLowerCase();
	function score(item, query) {
		if (!query) return 1;
		const title = norm(item.title);
		if (title === query) return 100;
		if (title.startsWith(query)) return 70;
		if (title.includes(query)) return 50;
		const text = norm(`${item.title} ${item.kind} ${item.note} ${(item.tags ?? []).join(" ")}`);
		const words = query.split(/\s+/).filter(Boolean);
		return words.every((word) => text.includes(word)) ? 20 + words.length : 0;
	}
	var box;
	var input;
	var results;
	var opener = null;
	var active = 0;
	var visible = [];
	var shortcutLabel = /Mac|iPhone|iPad|iPod/i.test(nav.userAgentData?.platform || nav.platform || nav.userAgent) ? "⌘ K" : "Ctrl K";
	var syncShortcutLabels = () => document.querySelectorAll("[data-search-shortcut]").forEach((element) => element.textContent = shortcutLabel);
	syncShortcutLabels();
	addEventListener("samey-pageload", syncShortcutLabels);
	function resultNode(item, index) {
		const anchor = document.createElement("a");
		anchor.className = `search-result${index === active ? " active" : ""}`;
		anchor.href = new URL(item.href, SCRIPT_ROOT).href;
		const text = document.createElement("span");
		const title = document.createElement("b");
		const note = document.createElement("small");
		const meta = document.createElement("span");
		meta.className = "search-result-meta";
		const kind = document.createElement("em");
		const destination = document.createElement("span");
		destination.className = "search-result-destination";
		const targetUrl = new URL(item.href, SCRIPT_ROOT);
		const external = targetUrl.origin !== location.origin;
		const newPage = external || targetUrl.pathname !== location.pathname;
		title.textContent = item.title;
		note.textContent = item.note;
		kind.textContent = item.kind;
		destination.textContent = external ? "↗" : newPage ? "→" : "";
		destination.setAttribute("aria-label", external ? "External website" : newPage ? "Opens another page" : "Opens in this page");
		if (external) {
			anchor.target = "_blank";
			anchor.rel = "noopener noreferrer";
		}
		text.append(title, note);
		meta.append(kind, destination);
		anchor.append(text, meta);
		return anchor;
	}
	function render() {
		const query = norm(input.value.trim());
		visible = searchIndex.map((item) => [item, score(item, query)]).filter(([, rank]) => rank > 0).sort(([a, ar], [b, br]) => br - ar || a.title.localeCompare(b.title)).slice(0, 9).map(([item]) => item);
		active = Math.min(active, Math.max(0, visible.length - 1));
		if (visible.length) results.replaceChildren(...visible.map(resultNode));
		else {
			const empty = document.createElement("div");
			empty.className = "search-empty";
			empty.textContent = "No match";
			results.replaceChildren(empty);
		}
	}
	function close(restoreFocus = true) {
		if (!box || box.hidden) return;
		box.hidden = true;
		const target = opener;
		opener = null;
		if (restoreFocus && target) requestAnimationFrame(() => target.isConnected && target.focus());
	}
	function ensure() {
		if (box) return;
		box = document.createElement("div");
		box.className = "site-search";
		box.dataset.sameyOverlay = "";
		box.dataset.sameyRuntime = "";
		box.hidden = true;
		box.innerHTML = "<div class=\"site-search-backdrop\" data-close-search></div><div class=\"site-search-panel\" role=\"dialog\" aria-modal=\"true\" aria-label=\"Search\"><div class=\"site-search-input\"><span>›</span><input autocomplete=\"off\" spellcheck=\"false\" placeholder=\"Search games, tools, writing, work…\"><kbd>esc</kbd></div><div class=\"site-search-results\"></div></div>";
		document.body.append(box);
		input = box.querySelector("input");
		results = box.querySelector(".site-search-results");
		input.addEventListener("input", () => {
			active = 0;
			render();
		});
		box.addEventListener("click", (event) => {
			const target = event.target instanceof Element ? event.target : null;
			if (target?.closest("a.search-result")) close(false);
			else if (target?.closest("[data-close-search]")) close();
		});
		input.addEventListener("keydown", (event) => {
			if (event.key === "ArrowDown" || event.key === "ArrowUp") {
				event.preventDefault();
				active = (active + (event.key === "ArrowDown" ? 1 : visible.length - 1)) % Math.max(visible.length, 1);
				render();
			} else if (event.key === "Enter" && visible[active]) {
				event.preventDefault();
				const targetUrl = new URL(visible[active].href, SCRIPT_ROOT);
				close(false);
				if (targetUrl.origin !== location.origin) window.open(targetUrl.href, "_blank", "noopener,noreferrer");
				else if (globalThis.SameyNavigate) globalThis.SameyNavigate(targetUrl.href);
				else location.assign(targetUrl.href);
			}
		});
	}
	function open$1(trigger) {
		ensure();
		opener = trigger instanceof HTMLElement ? trigger : document.activeElement instanceof HTMLElement ? document.activeElement : null;
		box.hidden = false;
		active = 0;
		input.value = "";
		render();
		requestAnimationFrame(() => input.focus());
	}
	addEventListener("samey-pageleave", () => close(false));
	addEventListener("keydown", (event) => {
		if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
			event.preventDefault();
			box && !box.hidden ? close() : open$1();
		} else if (event.key === "Escape") close();
	});
	document.addEventListener("click", (event) => {
		const trigger = (event.target instanceof Element ? event.target : null)?.closest("[data-open-search]");
		if (trigger) open$1(trigger);
	});
	//#endregion
})();
