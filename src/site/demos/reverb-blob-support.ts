/**
 * AudioBlobMaterial.kt and ReverbHomeBlobControl.BlobOverlay at Reverb 7694bbfb.
 * Colors enter as normalized RGB(A); native sampling rounds each blend to bytes.
 * The scene uses native dp, independently of its outer CSS transform or browser DPR.
 */
export type ReverbBlobSupportFrame = {
  life: number;
  presence: number;
  silence: number;
  activity: number;
  low: number;
  high: number;
  active: boolean;
  full: boolean;
  transitioning: boolean;
  primary: readonly number[];
  tertiary: readonly number[];
  paused: readonly number[];
  background: readonly number[];
  fallback?: boolean;
  contentOpacity?: number;
};

type Bounds = { left: number; top: number; right: number; bottom: number };
type Geometry = {
  minSize: number;
  footprint: number;
  agslMin: number;
  agslMax: number;
  fallbackMin: number;
  fallbackMax: number;
};

const SVG_NS = "http://www.w3.org/2000/svg";
const clamp = (value: number, minimum = 0, maximum = 1) =>
  Math.max(minimum, Math.min(maximum, value));
const smooth = (value: number) => value * value * (3 - 2 * value);
const byte = (value: number) => Math.round(clamp(value, 0, 255));
const rgb = (red: number, green: number, blue: number) =>
  (red << 16) | (green << 8) | blue;
const normalizedColor = (color: readonly number[]) =>
  rgb(byte((color[0] ?? 0) * 255), byte((color[1] ?? 0) * 255), byte((color[2] ?? 0) * 255));

function blend(first: number, second: number, fraction: number): number {
  const channel = (shift: number) => Math.round(
    ((first >> shift) & 255) * (1 - fraction) + ((second >> shift) & 255) * fraction,
  );
  return rgb(channel(16), channel(8), channel(0));
}

function luminance(color: number): number {
  const linear = (shift: number) => {
    const channel = ((color >> shift) & 255) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(16) + 0.7152 * linear(8) + 0.0722 * linear(0);
}

function mutedColor(color: number): number {
  const red = (color >> 16) & 255;
  const green = (color >> 8) & 255;
  const blue = color & 255;
  const light = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  const channel = (value: number) => byte((value + (light - value) * 0.42) * 0.72);
  return rgb(channel(red), channel(green), channel(blue));
}

function materialSample(
  active: number,
  paused: number,
  frame: ReverbBlobSupportFrame,
  radiusFraction: number,
): number {
  const life = smooth(clamp((frame.life - 0.36) / 0.5)) * frame.presence;
  const body = blend(paused, active, life);
  const drainWeight = 0.35 + 0.65 * smooth(clamp(radiusFraction / 0.7));
  const drain = clamp(frame.silence) * frame.presence * drainWeight * (frame.fallback ? 1 : life);
  return blend(body, mutedColor(frame.fallback ? active : body), drain);
}

const transitionLuminance = luminance(0x757575);
const darkInkLuminance = luminance(0x010101);
const lightInkLuminance = luminance(0xfefefe);
let nextSupportId = 0;

function resolveAppearance(frame: ReverbBlobSupportFrame, geometry: Geometry | null) {
  const primary = normalizedColor(frame.primary);
  const tertiary = normalizedColor(frame.tertiary);
  const paused = normalizedColor(frame.paused);
  const background = normalizedColor(frame.background);
  let darkInk = luminance(materialSample(blend(primary, tertiary, 0.5), paused, frame, 0.5)) >= transitionLuminance;

  const needsSupport = (dark: boolean): boolean => {
    if (!geometry || geometry.minSize <= 0 || geometry.footprint <= 0) return true;
    const radius = geometry.footprint / geometry.minSize;
    const base = 0.095 + frame.life * (0.235 + clamp(frame.activity) * 0.018);
    const energy = Math.sqrt(clamp(Math.max(frame.activity, frame.low * 0.9 + frame.high * 0.7))) *
      (1 - 0.92 * clamp(frame.silence)) * frame.life * frame.presence;
    const fold = energy * (0.043 + 0.035 * frame.low + 0.018 * frame.high);
    const covered = radius <= base - fold - 0.008 * frame.life * frame.presence - 0.012;
    const minimum = frame.fallback ? geometry.fallbackMin : geometry.agslMin;
    const maximum = frame.fallback ? geometry.fallbackMax : geometry.agslMax;
    const first = blend(primary, tertiary, minimum);
    const last = blend(primary, tertiary, maximum);
    const fraction = clamp(radius / base);
    const a = materialSample(first, paused, frame, 0);
    const b = materialSample(last, paused, frame, 0);
    const c = materialSample(first, paused, frame, fraction);
    const d = materialSample(last, paused, frame, fraction);
    const channel = (shift: number) => {
      const first = (a >> shift) & 255;
      const second = (b >> shift) & 255;
      const third = (c >> shift) & 255;
      const fourth = (d >> shift) & 255;
      if (!dark) return Math.max(first, second, third, fourth);
      const material = Math.min(first, second, third, fourth);
      return covered ? material : Math.min(material, (background >> shift) & 255);
    };
    const safe = (color: number) => {
      const rasterChannel = (shift: number) => clamp(((color >> shift) & 255) + (dark ? -2 : 2), 0, 255);
      const light = luminance(rgb(rasterChannel(16), rasterChannel(8), rasterChannel(0)));
      return dark ? (light + 0.05) / (darkInkLuminance + 0.05) >= 4.5
        : (lightInkLuminance + 0.05) / (light + 0.05) >= 4.5;
    };
    return !safe(rgb(channel(16), channel(8), channel(0))) || (!covered && !safe(background));
  };

  let support = needsSupport(darkInk);
  if (support && !needsSupport(!darkInk)) {
    darkInk = !darkInk;
    support = false;
  }
  return { darkInk, support };
}

export function installReverbBlobSupport(
  canvas: HTMLCanvasElement,
  content: HTMLElement,
  phone: HTMLElement,
): {
  update(frame: ReverbBlobSupportFrame): void;
  invalidateGeometry(): void;
  dispose(): void;
} {
  const document = phone.ownerDocument;
  const view = document.defaultView;
  const parent = canvas.parentElement;
  if (!view || !parent) throw new Error("Reverb blob support requires a mounted canvas");
  const window = view;
  const create = <K extends keyof SVGElementTagNameMap>(name: K) => document.createElementNS(SVG_NS, name);
  const attributes = (element: Element, values: Record<string, number | string>) => {
    for (const [name, value] of Object.entries(values)) element.setAttribute(name, String(value));
  };
  const prefix = `reverb-blob-support-${++nextSupportId}`;
  const layer = create("svg");
  attributes(layer, { "aria-hidden": "true", focusable: "false", preserveAspectRatio: "none" });
  layer.style.cssText = "position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none;z-index:1;display:none;";
  layer.setAttribute("color-interpolation", "sRGB");
  const defs = create("defs");
  layer.append(defs);
  const radial = create("radialGradient");
  const horizontal = create("linearGradient");
  const vertical = create("linearGradient");
  const gradients = [radial, horizontal, vertical];
  const masks = gradients.map((gradient, index) => {
    attributes(gradient, { id: `${prefix}-gradient-${index}`, gradientUnits: "userSpaceOnUse" });
    const mask = create("mask");
    attributes(mask, {
      id: `${prefix}-mask-${index}`, maskUnits: "userSpaceOnUse", maskContentUnits: "userSpaceOnUse",
      "mask-type": "alpha",
    });
    mask.style.maskType = "alpha";
    const rectangle = create("rect");
    rectangle.setAttribute("fill", `url(#${prefix}-gradient-${index})`);
    mask.append(rectangle);
    defs.append(gradient, mask);
    return { mask, rectangle };
  });
  const radialStops = Array.from({ length: 10 }, () => create("stop"));
  const horizontalStops = Array.from({ length: 18 }, () => create("stop"));
  const verticalStops = Array.from({ length: 18 }, () => create("stop"));
  radial.append(...radialStops);
  horizontal.append(...horizontalStops);
  vertical.append(...verticalStops);
  for (const stop of [...radialStops, ...horizontalStops, ...verticalStops]) stop.setAttribute("stop-color", "#fff");
  const radialGroup = create("g");
  radialGroup.setAttribute("mask", `url(#${prefix}-mask-0)`);
  const boundedGroup = create("g");
  const field = create("rect");
  boundedGroup.append(field);
  radialGroup.append(boundedGroup);
  layer.append(radialGroup);
  parent.insertBefore(layer, content.parentElement === parent ? content : canvas.nextSibling);

  const previousColor = content.style.getPropertyValue("color");
  const previousColorPriority = content.style.getPropertyPriority("color");
  let lastInk = "";
  let lastOwnedColor = "";
  let geometry: Geometry | null = null;
  let lastFrame: ReverbBlobSupportFrame | null = null;
  let pendingMeasure: number | undefined;
  let disposed = false;
  let appearanceKey = "";

  function applyFrame(frame: ReverbBlobSupportFrame) {
    if (disposed) return;
    const { darkInk, support } = resolveAppearance(frame, geometry);
    const color = frame.transitioning || frame.active && !frame.full ? darkInk ? "#000" : "#fff"
      : frame.full ? "var(--on-primary-container)" : "var(--on-surface-variant)";
    if (color !== lastInk) {
      content.style.setProperty("color", color);
      lastInk = color;
      lastOwnedColor = content.style.getPropertyValue("color");
    }
    const opacity = Math.round(clamp(frame.contentOpacity ?? 1) * 255) / 255;
    const visible = geometry !== null && support && (frame.active || frame.transitioning) &&
      (!frame.full || frame.transitioning) && opacity > 0;
    const grey = darkInk ? "#777777" : frame.transitioning ? "#757575" : "#6d6d6d";
    const key = `${visible}:${darkInk}:${frame.transitioning}:${grey}:${opacity}`;
    if (key === appearanceKey) return;
    appearanceKey = key;
    layer.style.display = visible ? "block" : "none";
    layer.style.mixBlendMode = darkInk ? "lighten" : "darken";
    field.setAttribute("fill", grey);
    field.setAttribute("opacity", String(opacity));
    if (frame.transitioning) {
      boundedGroup.removeAttribute("mask");
      field.removeAttribute("mask");
    } else {
      boundedGroup.setAttribute("mask", `url(#${prefix}-mask-1)`);
      field.setAttribute("mask", `url(#${prefix}-mask-2)`);
    }
  }

  const pixels = (value: string) => Number.parseFloat(value) || 0;
  function measure() {
    pendingMeasure = undefined;
    if (disposed) return;
    const canvasStyle = window.getComputedStyle(canvas);
    const contentStyle = window.getComputedStyle(content);
    const canvasWidth = pixels(canvasStyle.width) || canvas.clientWidth;
    const canvasHeight = pixels(canvasStyle.height) || canvas.clientHeight;
    const width = pixels(contentStyle.width) || content.clientWidth;
    const height = pixels(contentStyle.height) || content.clientHeight;
    const children: Bounds[] = [];
    let top = 0;
    // BlobOverlay is a centered vertical stack. Used CSS sizes stay local even
    // during the enclosing phone scale and perspective buffer flip.
    for (const child of content.children) {
      const style = window.getComputedStyle(child);
      if (style.display === "none") continue;
      const childWidth = pixels(style.width) || child.clientWidth;
      const childHeight = pixels(style.height) || child.clientHeight;
      top += pixels(style.marginTop);
      const left = (width - childWidth) / 2;
      children.push({ left, top, right: left + childWidth, bottom: top + childHeight });
      top += childHeight + pixels(style.marginBottom);
    }
    if (canvas.clientWidth <= 0 || canvas.clientHeight <= 0 || content.clientWidth <= 0 ||
      canvasWidth <= 0 || canvasHeight <= 0 || width <= 0 || height <= 0 || children.length === 0) {
      geometry = null;
      appearanceKey = "";
      if (lastFrame) applyFrame(lastFrame);
      return;
    }
    const centerX = width / 2;
    const cornerDistance = (centerY: number) => {
      let maximum = 0;
      for (const child of children) {
        const dx = Math.max(Math.abs(child.left - centerX), Math.abs(child.right - centerX));
        const dy = Math.max(Math.abs(child.top - centerY), Math.abs(child.bottom - centerY));
        maximum = Math.max(maximum, dx * dx + dy * dy);
      }
      return maximum;
    };
    let lower = 0;
    let upper = height;
    for (let index = 0; index < 24; index++) {
      const first = lower + (upper - lower) / 3;
      const second = upper - (upper - lower) / 3;
      if (cornerDistance(first) < cornerDistance(second)) upper = second;
      else lower = first;
    }
    const centerY = (lower + upper) / 2;
    const core = Math.sqrt(cornerDistance(centerY)) + 2;
    const outer = core + 24;
    const originX = (canvasWidth - width) / 2;
    const originY = (canvasHeight - height) / 2;
    const minSize = Math.min(canvasWidth, canvasHeight);
    const diagonalSquared = canvasWidth * canvasWidth + canvasHeight * canvasHeight;
    let agslMin = Infinity, agslMax = -Infinity, fallbackMin = Infinity, fallbackMax = -Infinity;
    for (const child of children) {
      const left = child.left - width / 2 - 2;
      const right = child.right - width / 2 + 2;
      const top = child.top - height / 2 - 2;
      const bottom = child.bottom - height / 2 + 2;
      agslMin = Math.min(agslMin, 0.46 + (0.9 * left - 0.55 * bottom) / minSize);
      agslMax = Math.max(agslMax, 0.46 + (0.9 * right - 0.55 * top) / minSize);
      fallbackMin = Math.min(fallbackMin, 0.5 + (left * canvasWidth + top * canvasHeight) / diagonalSquared);
      fallbackMax = Math.max(fallbackMax, 0.5 + (right * canvasWidth + bottom * canvasHeight) / diagonalSquared);
    }
    geometry = {
      minSize, footprint: core + Math.abs(centerY - height / 2),
      agslMin: clamp(agslMin), agslMax: clamp(agslMax),
      fallbackMin: clamp(fallbackMin), fallbackMax: clamp(fallbackMax),
    };
    attributes(layer, { viewBox: `0 0 ${canvasWidth} ${canvasHeight}` });
    const extent = {
      x: originX + centerX - outer, y: originY + centerY - outer,
      width: outer * 2, height: outer * 2,
    };
    for (const { mask, rectangle } of masks) {
      attributes(mask, extent);
      attributes(rectangle, extent);
    }
    attributes(field, extent);
    attributes(radial, { cx: originX + centerX, cy: originY + centerY, r: outer });
    attributes(horizontal, { x1: originX - 10, y1: 0, x2: originX + width + 10, y2: 0 });
    attributes(vertical, { x1: 0, y1: originY - 10, x2: 0, y2: originY + height + 10 });
    attributes(radialStops[0], { offset: 0, "stop-opacity": 1 });
    const coreFraction = core / outer;
    for (let index = 0; index <= 8; index++) {
      const t = index / 8;
      attributes(radialStops[index + 1], {
        offset: coreFraction + (1 - coreFraction) * t,
        "stop-opacity": Math.round((1 - smooth(t)) * 255) / 255,
      });
      const opacity = Math.round(smooth(t) * 255) / 255;
      const horizontalOffset = t * 8 / (width + 20);
      const verticalOffset = t * 8 / (height + 20);
      attributes(horizontalStops[index], { offset: horizontalOffset, "stop-opacity": opacity });
      attributes(horizontalStops[17 - index], { offset: 1 - horizontalOffset, "stop-opacity": opacity });
      attributes(verticalStops[index], { offset: verticalOffset, "stop-opacity": opacity });
      attributes(verticalStops[17 - index], { offset: 1 - verticalOffset, "stop-opacity": opacity });
    }
    appearanceKey = "";
    if (lastFrame) applyFrame(lastFrame);
  }

  function invalidateGeometry() {
    if (disposed || pendingMeasure !== undefined) return;
    pendingMeasure = window.requestAnimationFrame(measure);
  }
  const resizeObserver = new ResizeObserver(invalidateGeometry);
  resizeObserver.observe(canvas);
  resizeObserver.observe(content);
  const mutationObserver = new MutationObserver(invalidateGeometry);
  mutationObserver.observe(content, {
    subtree: true, childList: true, characterData: true, attributes: true,
    attributeFilter: ["class", "hidden"],
  });
  document.fonts.addEventListener("loadingdone", invalidateGeometry);
  void document.fonts.ready.then(invalidateGeometry, () => {});
  invalidateGeometry();

  return {
    update(frame) {
      if (disposed) return;
      lastFrame = frame;
      applyFrame(frame);
    },
    invalidateGeometry,
    dispose() {
      if (disposed) return;
      disposed = true;
      if (pendingMeasure !== undefined) window.cancelAnimationFrame(pendingMeasure);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      document.fonts.removeEventListener("loadingdone", invalidateGeometry);
      layer.remove();
      if (content.style.getPropertyValue("color") === lastOwnedColor && !content.style.getPropertyPriority("color")) {
        if (previousColor) content.style.setProperty("color", previousColor, previousColorPriority);
        else content.style.removeProperty("color");
      }
      lastFrame = null;
      geometry = null;
    },
  };
}
