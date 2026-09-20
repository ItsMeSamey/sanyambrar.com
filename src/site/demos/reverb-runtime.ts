// Interactive Reverb demo runtime. The geometry and state mirror the Android
// Compose surfaces in the Reverb repository; the demo remains browser-only.
export type ReverbDemoDocument = Pick<Document, "createElement"> & {
  querySelector<E extends Element = Element>(selectors: string): E | null;
  querySelectorAll<E extends Element = Element>(
    selectors: string,
  ): NodeListOf<E>;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): void;
};

type DemoRaf = (callback: FrameRequestCallback) => number;
type DemoSetTimeout = (
  handler: (...args: unknown[]) => void,
  timeout?: number,
  ...args: unknown[]
) => number;
type DemoClearTimeout = (id?: number) => void;
type DemoAddWindowEventListener = (
  type: keyof WindowEventMap,
  listener: EventListenerOrEventListenerObject,
  options?: boolean | AddEventListenerOptions,
) => () => void;
type BufferSlot = "one" | "loop";
type RetentionMode = "time" | "size";
type GestureMode = "settings" | "library";
type ScreenId =
  | "homeScreen"
  | "settingsScreen"
  | "libraryScreen"
  | "incidentsScreen"
  | "rangeScreen";
type BlobRuntime = {
  setActive(active: boolean): void;
  setVisible(visible: boolean): void;
  refreshTheme(): void;
  currentBaseRadiusFraction(): number;
};
type Uniforms = Record<string, WebGLUniformLocation | null>;
type SettingsSnapshot = {
  theme: string;
  retentionMode: RetentionMode;
  oneTimeSeconds: number;
  oneSizeMiB: number;
  loopTimeSeconds: number;
  loopSizeMiB: number;
  dropdowns: string[];
  wake: boolean;
};

const NOISE_URL = new URL("./reverb-noise.png", import.meta.url).href;
const PAUSE_PATH = "#i-pause";
const WAVE_PATH = "#i-wave";
const bufferSlot = (value: string | undefined): BufferSlot =>
  value === "loop" ? "loop" : "one";

export function runReverbDemoRuntime(
  document: ReverbDemoDocument,
  requestAnimationFrame: DemoRaf,
  setTimeout: DemoSetTimeout,
  clearTimeout: DemoClearTimeout,
  devicePixelRatio: number,
  addWindowEventListener: DemoAddWindowEventListener,
): Pick<BlobRuntime, "refreshTheme"> & { setDevicePixelRatio(devicePixelRatio: number): void; dispose(): void } {
  const byId = <T extends Element = HTMLElement>(id: string): T => {
    const element = document.querySelector<T>(`#${id}`);
    if (!element) throw new Error(`Reverb demo is missing #${id}`);
    return element;
  };
  const phone = byId<HTMLElement>("phone");
  let runtimeDevicePixelRatio = Math.max(devicePixelRatio || 1, 0.01);
  const syncDevicePixelRatio = (value: number) => {
    runtimeDevicePixelRatio = Math.max(value || 1, 0.01);
    phone.style.setProperty("--reverb-noise-size", `${1024 / runtimeDevicePixelRatio}px`);
  };
  phone.style.setProperty("--reverb-noise", `url("${NOISE_URL}")`);
  syncDevicePixelRatio(runtimeDevicePixelRatio);
  const blobControl = byId<HTMLButtonElement>("blobControl");
  const blobIconUse = byId<SVGUseElement>("blobIconUse");
  const blobTime = byId<HTMLElement>("blobTime");
  const blobSummary = byId<HTMLElement>("blobSummary");
  const toast = byId<HTMLElement>("toast");
  const captureSaveStatus = byId<HTMLElement>("captureSaveStatus");
  const captureSaveTitle = byId<HTMLElement>("captureSaveTitle");
  const captureSaveSubtitle = byId<HTMLElement>("captureSaveSubtitle");
  const captureSaveTrailing = byId<HTMLElement>("captureSaveTrailing");
  const captureSaveCancel = byId<HTMLButtonElement>("captureSaveCancel");
  const dropdownMenu = byId<HTMLElement>("dropdownMenu");
  const screens = [...document.querySelectorAll<HTMLElement>(".screen")];
  const homeScreen = byId<HTMLElement>("homeScreen");
  const settingsScreen = byId<HTMLElement>("settingsScreen");
  const libraryScreen = byId<HTMLElement>("libraryScreen");
  const PANEL_SETTLE_DURATION_MS = 220;
  const PANEL_COMMIT_PROGRESS = 0.12;
  let settingsPanelProgress = 0;
  let libraryPanelProgress = 0;
  let settingsPanelOpen = false;
  let libraryPanelOpen = false;
  let settingsMotionEpoch = 0;
  let libraryMotionEpoch = 0;
  let settingsForegroundScreen = homeScreen;

  let currentScreen: ScreenId = "homeScreen";
  let settingsReturnScreen: ScreenId = "homeScreen";
  let incidentsReturnScreen: ScreenId = "homeScreen";
  let live = true;
  let activeBuffer: BufferSlot | null = "one";
  let displayedBuffer: BufferSlot = "one";
  let bufferTransitionTarget: BufferSlot | null = null;
  let bufferTransitionProgress = 0;
  let bufferDragging = false;
  let bufferTransitionEpoch = 0;
  let bufferSwipePointerId = -1;
  let bufferSwipeStartX = 0;
  let bufferSwipeStartY = 0;
  let suppressBlobClick = false;
  let rangeBuffer: BufferSlot = "one";
  let oneSeconds = 30 * 60;
  let loopSeconds = 47 * 3600 + 59 * 60 + 55;
  const bytesPerSecond = 44100 * 2;
  let oneRetentionTimeSeconds = 24 * 3600;
  let loopRetentionTimeSeconds = 48 * 3600;
  let oneRetentionSizeMiB = 6;
  let loopRetentionSizeMiB = 4199;
  let oneLimitSeconds = oneRetentionTimeSeconds;
  let loopLimitSeconds = loopRetentionTimeSeconds;
  let lastTick = performance.now();
  let toastTimer = 0;
  let rangeExportPending = false;
  let rangeExportGeneration = 0;
  let captureSaveMotionEpoch = 0;
  let captureExportCompletionTimer = 0;
  let captureSaveDismissTimer = 0;
  let settingsDirty = false;
  let retentionMode: RetentionMode = "time";
  let settingsInitial: SettingsSnapshot;
  let settingsOneTimeSeconds = oneRetentionTimeSeconds;
  let settingsLoopTimeSeconds = loopRetentionTimeSeconds;
  let settingsOneSizeMiB = oneRetentionSizeMiB;
  let settingsLoopSizeMiB = loopRetentionSizeMiB;
  let settingsOneTimeText = "";
  let settingsLoopTimeText = "";
  let settingsOneSizeText = "";
  let settingsLoopSizeText = "";
  let settingsReturnFocus: HTMLElement | null = null;
  let incidentsReturnFocus: HTMLElement | null = null;

  const blobShader = makeBlobShader(byId<HTMLCanvasElement>("blobCanvas"));
  blobShader.setActive(true);

  function formatTimer(seconds: number): string {
    const value = Math.max(0, Math.floor(seconds));
    const h = Math.floor(value / 3600);
    const m = Math.floor((value % 3600) / 60);
    const s = value % 60;
    return h > 0
      ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
      : `${m}:${String(s).padStart(2, "0")}`;
  }
  function formatMiB(seconds: number): string {
    return `${((seconds * bytesPerSecond) / (1024 * 1024)).toFixed(1)} MiB`;
  }
  function parseRetentionTime(value: string): number | null {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (!trimmed.includes(":")) {
      const minutes = Number(trimmed.replace(",", "."));
      if (!Number.isFinite(minutes) || minutes < 0) return null;
      const seconds = Math.round(minutes * 60);
      return seconds <= 0x7fffffff ? seconds : null;
    }
    const parts = trimmed.split(":");
    if (
      parts.length < 2 ||
      parts.length > 3 ||
      parts.some((part) => !/^\d+$/.test(part))
    )
      return null;
    const values = parts.map(Number);
    if (values.slice(1).some((part) => part >= 60)) return null;
    let seconds = 0;
    for (const part of values) {
      seconds = seconds * 60 + part;
      if (seconds > 0x7fffffff) return null;
    }
    return seconds;
  }
  function parseRetentionSize(value: string): number | null {
    const size = Number(value.trim().replace(",", "."));
    return Number.isFinite(size) && size >= 0 ? size : null;
  }
  function bufferRenderedBuffer(): BufferSlot {
    return bufferTransitionTarget != null && bufferTransitionProgress >= 0.5
      ? bufferTransitionTarget
      : displayedBuffer;
  }
  function currentSeconds(buffer: BufferSlot = bufferRenderedBuffer()): number {
    return buffer === "one" ? oneSeconds : loopSeconds;
  }
  function showToast(message: string): void {
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add("show");
    toastTimer = setTimeout(() => toast.classList.remove("show"), 1200);
  }
  function criticalSpringRemaining(elapsedMs: number, stiffness = 400): number {
    const seconds = Math.max(0, elapsedMs) / 1000;
    const omega = Math.sqrt(stiffness);
    return (1 + omega * seconds) * Math.exp(-omega * seconds);
  }
  function animateCaptureSaveVisibility(entering: boolean): void {
    const epoch = ++captureSaveMotionEpoch;
    const startedAt = performance.now();
    const height = Math.max(1, captureSaveStatus.getBoundingClientRect().height || 68);
    const startOffset = entering ? height * 0.5 : 0;
    const targetOffset = entering ? 0 : height;
    const frame = (now: number) => {
      if (epoch !== captureSaveMotionEpoch) return;
      const remaining = criticalSpringRemaining(now - startedAt);
      const progress = 1 - remaining;
      const y = startOffset + (targetOffset - startOffset) * progress;
      captureSaveStatus.style.transform = `translateY(${y}px)`;
      captureSaveStatus.style.opacity = String(entering ? progress : remaining);
      if (remaining > 0.001) {
        requestAnimationFrame(frame);
        return;
      }
      captureSaveStatus.style.transform = entering ? "translateY(0)" : `translateY(${height}px)`;
      captureSaveStatus.style.opacity = entering ? "1" : "0";
      if (!entering) {
        captureSaveStatus.hidden = true;
        captureSaveStatus.classList.remove("visible", "saving", "saved");
        captureSaveStatus.setAttribute("aria-hidden", "true");
      }
    };
    requestAnimationFrame(frame);
  }
  function formatSavedRecordingDuration(seconds: number): string {
    const whole = Math.max(0, Math.round(seconds));
    const hours = Math.floor(whole / 3600);
    const minutes = Math.floor((whole % 3600) / 60);
    const secs = whole % 60;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m ${secs}s`;
  }
  function formatSavedRecordingTime(date = new Date()): string {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }).toLowerCase();
  }
  function showCaptureSavingStatus(): void {
    clearTimeout(captureSaveDismissTimer);
    const wasHidden = captureSaveStatus.hidden;
    captureSaveStatus.hidden = false;
    captureSaveStatus.classList.add("visible", "saving");
    captureSaveStatus.classList.remove("saved");
    captureSaveStatus.setAttribute("aria-hidden", "false");
    captureSaveTitle.textContent = "Saving";
    captureSaveSubtitle.textContent = "Reverb";
    captureSaveTrailing.textContent = "";
    captureSaveCancel.hidden = false;
    captureSaveCancel.disabled = false;
    if (wasHidden) {
      captureSaveStatus.style.opacity = "0";
      captureSaveStatus.style.transform = "translateY(34px)";
      animateCaptureSaveVisibility(true);
    }
  }
  function showCaptureSavedStatus(durationSeconds: number): void {
    captureSaveStatus.hidden = false;
    captureSaveStatus.classList.add("visible", "saved");
    captureSaveStatus.classList.remove("saving");
    captureSaveStatus.setAttribute("aria-hidden", "false");
    captureSaveTitle.textContent = `${Date.now()}.wav`;
    captureSaveSubtitle.textContent = `${formatSavedRecordingDuration(durationSeconds)} • ${formatMiB(durationSeconds)}`;
    captureSaveTrailing.textContent = formatSavedRecordingTime();
    captureSaveCancel.hidden = true;
    clearTimeout(captureSaveDismissTimer);
    captureSaveDismissTimer = setTimeout(() => {
      animateCaptureSaveVisibility(false);
    }, 1500);
  }
  function beginCaptureExport(
    durationSeconds: number,
    onSaved?: () => void,
  ): void {
    const generation = ++rangeExportGeneration;
    clearTimeout(captureExportCompletionTimer);
    clearTimeout(captureSaveDismissTimer);
    rangeExportPending = true;
    syncBufferUi();
    showCaptureSavingStatus();
    captureExportCompletionTimer = setTimeout(() => {
      if (generation !== rangeExportGeneration) return;
      onSaved?.();
      rangeExportPending = false;
      syncBufferUi();
      showCaptureSavedStatus(durationSeconds);
    }, 1200);
  }
  function defaultScreenFocus(id: ScreenId): HTMLElement {
    switch (id) {
      case "settingsScreen":
        return byId<HTMLElement>("settingsNav");
      case "libraryScreen":
        return byId<HTMLElement>("libraryBrand");
      case "incidentsScreen":
        return byId<HTMLElement>("incidentsBack");
      case "rangeScreen":
        return byId<HTMLElement>("rangeDurationWheel");
      default:
        return byId<HTMLElement>("brandButton");
    }
  }
  function focusScreen(id: ScreenId, preferred?: HTMLElement | null): void {
    const target =
      preferred?.isConnected && preferred.getClientRects().length > 0
        ? preferred
        : defaultScreenFocus(id);
    if (target.isConnected && target.getClientRects().length > 0)
      target.focus({ preventScroll: true });
  }
  function activateScreen(id: ScreenId): void {
    screens.forEach((screen) =>
      screen.classList.toggle("active", screen.id === id),
    );
  }
  function fastOutSlowIn(progress: number): number {
    const x = Math.max(0, Math.min(1, progress));
    if (x === 0 || x === 1) return x;
    const sample = (t: number, a: number, b: number) =>
      3 * (1 - t) * (1 - t) * t * a +
      3 * (1 - t) * t * t * b +
      t * t * t;
    const slope = (t: number, a: number, b: number) =>
      3 * (1 - t) * (1 - t) * a +
      6 * (1 - t) * t * (b - a) +
      3 * t * t * (1 - b);
    let t = x;
    for (let i = 0; i < 5; i++) {
      const d = slope(t, 0.4, 0.2);
      if (Math.abs(d) < 1e-6) break;
      t = Math.max(0, Math.min(1, t - (sample(t, 0.4, 0.2) - x) / d));
    }
    let low = 0;
    let high = 1;
    for (let i = 0; i < 8; i++) {
      const tx = sample(t, 0.4, 0.2);
      if (Math.abs(tx - x) < 1e-6) break;
      if (tx < x) low = t;
      else high = t;
      t = (low + high) * 0.5;
    }
    return sample(t, 0, 1);
  }
  function setScreenMotionVisibility(screen: HTMLElement, visible: boolean): void {
    screen.classList.toggle("motion-visible", visible);
  }
  function renderSettingsPanelProgress(progress: number): void {
    settingsPanelProgress = Math.max(0, Math.min(1, progress));
    const visible = settingsPanelOpen || settingsPanelProgress > 0.0001;
    setScreenMotionVisibility(settingsScreen, visible);
    setScreenMotionVisibility(settingsForegroundScreen, visible);
    settingsForegroundScreen.classList.toggle("motion-foreground", visible);
    if (visible) {
      settingsForegroundScreen.style.transform =
        `translate3d(0,${settingsPanelProgress * 100}%,0)`;
      settingsScreen.style.zIndex = "10";
      settingsForegroundScreen.style.zIndex = "11";
    } else {
      settingsForegroundScreen.style.removeProperty("transform");
      settingsForegroundScreen.style.removeProperty("z-index");
      settingsScreen.style.removeProperty("z-index");
    }
  }
  function renderLibraryPanelProgress(progress: number): void {
    libraryPanelProgress = Math.max(0, Math.min(1, progress));
    const visible = libraryPanelOpen || libraryPanelProgress > 0.0001;
    setScreenMotionVisibility(libraryScreen, visible);
    setScreenMotionVisibility(homeScreen, visible);
    libraryScreen.style.setProperty("--library-progress", String(libraryPanelProgress));
    libraryScreen.style.setProperty(
      "--library-offset-y",
      `${(1 - libraryPanelProgress) * phone.clientHeight}px`,
    );
    if (!visible) {
      libraryScreen.style.removeProperty("--library-progress");
      libraryScreen.style.removeProperty("--library-offset-y");
    }
  }
  function settleSettingsPanel(target: 0 | 1, onDone?: () => void): void {
    const epoch = ++settingsMotionEpoch;
    const from = settingsPanelProgress;
    const startedAt = performance.now();
    const frame = (now: number) => {
      if (epoch !== settingsMotionEpoch) return;
      const raw = Math.min(
        1,
        Math.max(0, (now - startedAt) / PANEL_SETTLE_DURATION_MS),
      );
      renderSettingsPanelProgress(from + (target - from) * fastOutSlowIn(raw));
      if (raw < 1) requestAnimationFrame(frame);
      else {
        renderSettingsPanelProgress(target);
        onDone?.();
      }
    };
    requestAnimationFrame(frame);
  }
  function settleLibraryPanel(target: 0 | 1, onDone?: () => void): void {
    const epoch = ++libraryMotionEpoch;
    const from = libraryPanelProgress;
    const startedAt = performance.now();
    const frame = (now: number) => {
      if (epoch !== libraryMotionEpoch) return;
      const raw = Math.min(
        1,
        Math.max(0, (now - startedAt) / PANEL_SETTLE_DURATION_MS),
      );
      renderLibraryPanelProgress(from + (target - from) * fastOutSlowIn(raw));
      if (raw < 1) requestAnimationFrame(frame);
      else {
        renderLibraryPanelProgress(target);
        onDone?.();
      }
    };
    requestAnimationFrame(frame);
  }
  function showScreen(
    id: ScreenId,
    focusTarget?: HTMLElement | null,
  ): void {
    currentScreen = id;
    activateScreen(id);
    blobShader.setVisible(
      id === "homeScreen" && !settingsPanelOpen && !libraryPanelOpen,
    );
    closeDropdown();
    focusScreen(id, focusTarget);
  }
  function openSettings(event?: Event): void {
    if (currentScreen === "settingsScreen" && settingsPanelOpen) return;
    const sourceScreen = currentScreen === "libraryScreen" ? "homeScreen" : currentScreen;
    settingsReturnScreen = sourceScreen;
    settingsReturnFocus =
      event?.currentTarget instanceof HTMLElement
        ? event.currentTarget
        : sourceScreen === "homeScreen"
          ? byId<HTMLElement>("openSettings")
          : sourceScreen === "rangeScreen"
            ? byId<HTMLElement>("rangeSettings")
            : null;
    settingsForegroundScreen = byId<HTMLElement>(sourceScreen);
    prepareSettingsSession();
    settingsPanelOpen = true;
    currentScreen = "settingsScreen";
    activateScreen("settingsScreen");
    renderSettingsPanelProgress(settingsPanelProgress);
    blobShader.setVisible(false);
    closeDropdown();
    focusScreen("settingsScreen");
    settleSettingsPanel(1);
  }
  function closeSettingsPanel(): void {
    if (!settingsPanelOpen && settingsPanelProgress <= 0) return;
    settingsPanelOpen = false;
    currentScreen = settingsReturnScreen;
    activateScreen(settingsReturnScreen);
    blobShader.setVisible(
      settingsReturnScreen === "homeScreen" && !libraryPanelOpen,
    );
    closeDropdown();
    focusScreen(settingsReturnScreen, settingsReturnFocus);
    settleSettingsPanel(0, () => renderSettingsPanelProgress(0));
  }
  function openLibraryPanel(): void {
    if (libraryPanelOpen && currentScreen === "libraryScreen") return;
    libraryPanelOpen = true;
    currentScreen = "libraryScreen";
    activateScreen("libraryScreen");
    renderLibraryPanelProgress(libraryPanelProgress);
    blobShader.setVisible(false);
    closeDropdown();
    focusScreen("libraryScreen");
    settleLibraryPanel(1);
  }
  function closeLibraryPanel(
    focusTarget: HTMLElement | null = byId<HTMLElement>("openLibrary"),
  ): void {
    if (!libraryPanelOpen && libraryPanelProgress <= 0) return;
    libraryPanelOpen = false;
    currentScreen = "homeScreen";
    activateScreen("homeScreen");
    blobShader.setVisible(!settingsPanelOpen);
    closeDropdown();
    if (focusTarget) focusScreen("homeScreen", focusTarget);
    settleLibraryPanel(0, () => renderLibraryPanelProgress(0));
  }
  function openIncidents(event?: Event): void {
    if (currentScreen !== "incidentsScreen")
      incidentsReturnScreen = currentScreen;
    incidentsReturnFocus =
      event?.currentTarget instanceof HTMLElement
        ? event.currentTarget
        : currentScreen === "homeScreen"
          ? byId<HTMLElement>("openIncidents")
          : currentScreen === "rangeScreen"
            ? byId<HTMLElement>("rangeIncidents")
            : null;
    showScreen("incidentsScreen");
  }
  function setIncidentAlert(active: boolean): void {
    document
      .querySelectorAll<HTMLElement>(".top-action.incidents")
      .forEach((button) => button.classList.toggle("alert", active));
  }
  function updateClock(): void {
    const now = new Date();
    let h = now.getHours();
    const m = String(now.getMinutes()).padStart(2, "0");
    h = h % 12 || 12;
    document.querySelectorAll<HTMLElement>(".status-time").forEach((node) => {
      node.textContent = `${h}:${m}`;
    });
  }
  updateClock();
  setTimeout(function clockTick() {
    updateClock();
    setTimeout(clockTick, 30000);
  }, 30000);

  const blobFlipFace = byId<HTMLElement>("blobFlipFace");
  const bufferFlipActionIcons = [
    ...document.querySelectorAll<SVGElement>(
      ".actions-row .action-button:nth-child(-n+3) svg",
    ),
  ];
  const blobArea = document.querySelector<HTMLElement>(".blob-area");
  if (!blobArea) throw new Error("Reverb demo is missing the blob gesture area");
  const BUFFER_SWIPE_COMMIT_PROGRESS = 0.16;
  const BUFFER_FLIP_DURATION_MS = 260;
  const BUFFER_FLIP_MIDPOINT_SCALE = 0.94;
  function oppositeBuffer(buffer: BufferSlot): BufferSlot {
    return buffer === "one" ? "loop" : "one";
  }
  function bufferFlipDegrees(): number {
    const target = bufferTransitionTarget;
    if (target == null || target === displayedBuffer) return 0;
    const p = Math.max(0, Math.min(1, bufferTransitionProgress));
    const direction = target === "loop" ? -1 : 1;
    return direction * (p < 0.5 ? p : p - 1) * 180;
  }
  function bufferDepthScale(): number {
    if (bufferTransitionTarget == null) return 1;
    const p = Math.max(0, Math.min(1, bufferTransitionProgress));
    return (
      BUFFER_FLIP_MIDPOINT_SCALE +
      (1 - BUFFER_FLIP_MIDPOINT_SCALE) * Math.abs(p * 2 - 1)
    );
  }
  function renderBufferTransition(): void {
    const degrees = bufferFlipDegrees();
    const depth = bufferDepthScale();
    const transform = `perspective(24px) rotateY(${degrees}deg) scaleY(${depth})`;
    blobFlipFace.style.transform = transform;
    blobFlipFace.style.setProperty(
      "--buffer-flip-progress",
      String(bufferTransitionProgress),
    );
    blobFlipFace.style.setProperty("--buffer-flip-degrees", String(degrees));
    blobFlipFace.style.setProperty("--buffer-depth-scale", String(depth));
    bufferFlipActionIcons.forEach((icon) => {
      icon.style.transform = transform;
    });
    syncBufferUi();
  }
  function completeBufferTransition(commit: boolean): void {
    const target = bufferTransitionTarget;
    if (commit && target != null) {
      displayedBuffer = target;
    }
    bufferTransitionTarget = null;
    bufferTransitionProgress = 0;
    bufferDragging = false;
    renderBufferTransition();
  }
  function settleBufferTransition(targetProgress: 0 | 1, commit: boolean): void {
    const epoch = ++bufferTransitionEpoch;
    const from = bufferTransitionProgress;
    const startedAt = performance.now();
    const frame = (now: number) => {
      if (epoch !== bufferTransitionEpoch || bufferDragging) return;
      const raw = Math.min(
        1,
        Math.max(0, (now - startedAt) / BUFFER_FLIP_DURATION_MS),
      );
      bufferTransitionProgress =
        from + (targetProgress - from) * fastOutSlowIn(raw);
      renderBufferTransition();
      if (raw < 1) requestAnimationFrame(frame);
      else completeBufferTransition(commit && targetProgress === 1);
    };
    requestAnimationFrame(frame);
  }
  function requestBufferNavigation(target: BufferSlot): void {
    if (
      rangeExportPending ||
      bufferDragging ||
      bufferTransitionTarget != null ||
      target === displayedBuffer
    )
      return;
    bufferTransitionTarget = target;
    bufferTransitionProgress = 0;
    renderBufferTransition();
    settleBufferTransition(1, true);
  }

  function syncBufferUi(): void {
    const renderedBuffer = bufferRenderedBuffer();
    document
      .querySelectorAll<HTMLButtonElement>(".buffer-segment")
      .forEach((segment) => {
        const slot = bufferSlot(segment.dataset.buffer);
        const selected = slot === renderedBuffer;
        const recording = live && activeBuffer === slot;
        segment.classList.toggle("selected", selected);
        segment.classList.toggle("idle", selected && !recording);
        segment.setAttribute("aria-selected", String(selected));
        segment.setAttribute("aria-disabled", String(rangeExportPending));
        segment.tabIndex = selected ? 0 : -1;
      });
    const displayedActive = live && activeBuffer === renderedBuffer;
    const blockedByOther =
      live && activeBuffer != null && activeBuffer !== renderedBuffer;
    blobControl.classList.toggle("live", displayedActive);
    blobControl.classList.toggle("dimmed", blockedByOther || rangeExportPending);
    blobControl.disabled = rangeExportPending;
    blobControl.setAttribute(
      "aria-label",
      displayedActive ? "Tap to pause capture" : "Tap to start capture",
    );
    blobIconUse.setAttribute("href", displayedActive ? PAUSE_PATH : WAVE_PATH);
    blobTime.textContent = formatTimer(currentSeconds(renderedBuffer));
    blobSummary.textContent = formatMiB(currentSeconds(renderedBuffer));
    blobSummary.classList.toggle("hidden", !displayedActive);
    const exportFull = document.querySelector<HTMLButtonElement>(
      '.action-button[aria-label="Export full"]',
    );
    if (!exportFull) throw new Error("Reverb demo is missing Export full");
    exportFull.disabled = rangeExportPending;
    byId<HTMLButtonElement>("openRange").disabled = rangeExportPending;
    byId<HTMLButtonElement>("clearBuffer").disabled =
      rangeExportPending || displayedActive;
    byId<HTMLButtonElement>("openLibrary").disabled = rangeExportPending;
    blobShader.setActive(displayedActive && !phone.classList.contains("about-open"));
  }
  function appendCapture(seconds: number): void {
    if (!live || activeBuffer == null || seconds <= 0) return;
    if (activeBuffer === "one") {
      oneSeconds = Math.min(oneLimitSeconds, oneSeconds + seconds);
      if (oneSeconds >= oneLimitSeconds) {
        live = false;
        activeBuffer = null;
      }
    } else {
      loopSeconds = Math.min(loopLimitSeconds, loopSeconds + seconds);
    }
  }
  function scheduleTick(): void {
    const elapsed = performance.now() - lastTick;
    setTimeout(tick, Math.max(16, 1000 - (elapsed % 1000)));
  }
  function tick(): void {
    const now = performance.now();
    if (now - lastTick >= 1000) {
      const elapsed = Math.floor((now - lastTick) / 1000);
      lastTick += elapsed * 1000;
      appendCapture(elapsed);
      syncBufferUi();
    }
    scheduleTick();
  }
  renderBufferTransition();
  scheduleTick();

  const initialRememberedRangeDurationSeconds = 2 * 3600 + 23 * 60 + 53.7;
  type RememberedRangeExport = {
    selectionSeconds: number;
    endOffsetSeconds: number;
  };
  const rememberedRangeExports: Record<BufferSlot, RememberedRangeExport> = {
    one: { selectionSeconds: initialRememberedRangeDurationSeconds, endOffsetSeconds: 0 },
    loop: { selectionSeconds: initialRememberedRangeDurationSeconds, endOffsetSeconds: 0 },
  };
  type RangeEditTarget = "start" | "end";
  const rangeStartInput = byId<HTMLElement>("rangeStart");
  const rangeEndInput = byId<HTMLElement>("rangeEnd");
  const rangeStartBoundary = byId<HTMLElement>("rangeStartBoundary");
  const rangeEndBoundary = byId<HTMLElement>("rangeEndBoundary");
  const rangeDurationWheel = byId<HTMLElement>("rangeDurationWheel");
  const rangeExportButton = byId<HTMLButtonElement>("rangeExport");
  const rangeWaveboxCandidate =
    document.querySelector<HTMLElement>(".range-timeline .wavebox");
  if (!rangeWaveboxCandidate) throw new Error("Reverb demo is missing range waveform");
  const rangeWavebox: HTMLElement = rangeWaveboxCandidate;
  const rangeScreen = byId<HTMLElement>("rangeScreen");
  const rangeMainCandidate = rangeScreen.querySelector<HTMLElement>(".range-main");
  const rangeMorphWave = byId<SVGSVGElement>("rangeMorphWave");
  const rangeMorphOval = byId<SVGEllipseElement>("rangeMorphOval");
  const rangeMorphPath = byId<SVGPathElement>("rangeMorphPath");
  const rangeFinalWave = byId<SVGSVGElement>("rangeFinalWave");
  if (!rangeMainCandidate) throw new Error("Reverb demo is missing range main content");
  const rangeMain: HTMLElement = rangeMainCandidate;
  const RANGE_OPEN_DURATION_MS = 760;
  const RANGE_BLOB_MORPH_HANDOFF_PROGRESS = 0.07;
  const RANGE_INTERACTION_READY_PROGRESS = 0.98;
  const RANGE_WAVEFORM_BUILD_PROGRESS = 0.96;
  const RANGE_WAVEFORM_COARSE_REVEAL_MS = 430;
  let rangeOpeningEpoch = 0;
  let rangeOpening = false;
  let rangeInteractionReady = false;
  let rangeWaveRevealStartedAt: number | null = null;
  let rangeSourceGeometry: {
    centerX: number;
    centerY: number;
    bodyDiameter: number;
  } | null = null;
  let rangeTimelineDurationSeconds = 0.1;
  let rangeStartSeconds = 0;
  let rangeEndSeconds = 0.1;
  let rangeEditTarget: RangeEditTarget = "start";
  let rangeWheelProfileIndex = 0;
  const rangeWheelProfiles = ["1x", "5x", "15x"] as const;
  type RangeWheelColumn = "hour" | "minute" | "second" | "profile";
  let rangeWheelPointerId = -1;
  let rangeWheelPointerColumn: RangeWheelColumn | null = null;
  let rangeWheelPinnedTarget: RangeEditTarget | null = null;
  let rangeWheelPointerDownY = 0;
  let rangeWheelPointerY = 0;
  let rangeWheelPointerOriginRows = 0;
  let rangeWheelPointerDragged = false;
  let rangeWheelCommitAllowed = false;
  let rangeWheelSettleTimer = 0;
  let rangeWheelSettle: {
    column: RangeWheelColumn;
    target: RangeEditTarget;
    startRows: number;
    targetRows: number;
    startedAt: number;
  } | null = null;
  let rangeWheelSuppressClick = false;
  const rangeWheelInteractionActive = () =>
    rangeWheelPointerId !== -1 || rangeWheelSettleTimer !== 0;

  const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
  const smoothStep = (value: number) => {
    const t = clamp01(value);
    return t * t * (3 - 2 * t);
  };
  function setRangeInteractionReady(ready: boolean): void {
    if (rangeInteractionReady === ready) return;
    rangeInteractionReady = ready;
    rangeMain.inert = !ready;
    rangeDurationWheel.tabIndex = ready ? 0 : -1;
    rangeDurationWheel.setAttribute("aria-disabled", String(!ready));
    rangeScreen.dataset.rangeInteractionReady = String(ready);
    if (
      ready &&
      currentScreen === "rangeScreen" &&
      !phone.classList.contains("about-mounted")
    ) {
      rangeDurationWheel.focus({ preventScroll: true });
    }
  }
  function renderRangeMorphShape(morphProgress: number, phase: number): void {
    const morphProgressClamped = clamp01(morphProgress);
    if (morphProgressClamped <= 0) {
      rangeMorphOval.style.display = "";
      rangeMorphPath.style.display = "none";
      return;
    }
    rangeMorphOval.style.display = "none";
    rangeMorphPath.style.display = "";
    const width = 360;
    const height = 146;
    const center = height * 0.5;
    const ribbonProgress = clamp01((morphProgressClamped - 0.08) / 0.92);
    const morph = smoothStep(ribbonProgress);
    const minimumAmplitude = height * 0.035 * morph;
    const maxAmplitude = height * (0.5 - 0.06 * morph);
    const pointCount = morphProgressClamped < 0.85 ? 128 : morphProgressClamped < 0.995 ? 256 : 360;
    const amplitudes = new Array<number>(pointCount);
    const top: string[] = [];
    const bottom: string[] = [];
    for (let point = 0; point < pointCount; point++) {
      const u = point / Math.max(1, pointCount - 1);
      const xNorm = (u - 0.5) * 2;
      const circle = Math.sqrt(Math.max(0, 1 - xNorm * xNorm));
      const organic = 1 + 0.018 * morph * Math.sin(u * 19 + phase * 0.7);
      const blobEnvelope = clamp01(circle * organic);
      const ribbonWobble = Math.max(
        0.08,
        Math.min(
          0.68,
          0.27 +
            0.07 * Math.sin(u * 31 + phase * 2.25) +
            0.04 * Math.sin(u * 67 - phase * 1.62) +
            0.022 * Math.sin(u * 113 + phase * 1.08),
        ),
      );
      const sample = blobEnvelope + (ribbonWobble - blobEnvelope) * morph;
      const amplitude = minimumAmplitude + maxAmplitude * clamp01(sample);
      amplitudes[point] = amplitude;
      const x = (width * point) / Math.max(1, pointCount - 1);
      top.push(`${point === 0 ? "M" : "L"}${x.toFixed(2)} ${(center - amplitude).toFixed(2)}`);
    }
    for (let point = pointCount - 1; point >= 0; point--) {
      const x = (width * point) / Math.max(1, pointCount - 1);
      bottom.push(`L${x.toFixed(2)} ${(center + (amplitudes[point] ?? 0)).toFixed(2)}`);
    }
    rangeMorphPath.setAttribute("d", `${top.join(" ")} ${bottom.join(" ")} Z`);
  }
  function renderRangeOpeningFrame(
    visualProgress: number,
    now: number,
  ): void {
    const source = rangeSourceGeometry;
    if (!source) return;
    const visual = clamp01(visualProgress);
    const morph = clamp01(
      (visual - RANGE_BLOB_MORPH_HANDOFF_PROGRESS) /
        (1 - RANGE_BLOB_MORPH_HANDOFF_PROGRESS),
    );
    const chrome = clamp01((visual - 0.46) / 0.42);
    const target = rangeWavebox.getBoundingClientRect();
    const startScaleX = source.bodyDiameter / Math.max(1, target.width);
    const startScaleY = source.bodyDiameter / Math.max(1, target.height);
    const scaleX = startScaleX + (1 - startScaleX) * morph;
    const scaleY = startScaleY + (1 - startScaleY) * morph;
    const translationX =
      (source.centerX - (target.left + target.width * 0.5)) * (1 - morph);
    const translationY =
      (source.centerY - (target.top + target.height * 0.5)) * (1 - morph);
    rangeMorphWave.style.transform =
      `translate3d(${translationX}px,${translationY}px,0) scale(${scaleX},${scaleY})`;
    rangeMorphWave.style.setProperty("--range-morph-progress", String(morph));
    rangeMorphWave.style.setProperty("--range-start-scale-x", String(startScaleX));
    rangeMorphWave.style.setProperty("--range-start-scale-y", String(startScaleY));
    rangeScreen.style.setProperty("--range-chrome-alpha", String(chrome));
    rangeScreen.style.setProperty("--range-transition-progress", String(visual));
    renderRangeMorphShape(morph, now / 1000);

    if (visual >= RANGE_WAVEFORM_BUILD_PROGRESS && rangeWaveRevealStartedAt == null)
      rangeWaveRevealStartedAt = now;
    const reveal =
      rangeWaveRevealStartedAt == null
        ? 0
        : fastOutSlowIn(
            clamp01(
              (now - rangeWaveRevealStartedAt) /
                RANGE_WAVEFORM_COARSE_REVEAL_MS,
            ),
          );
    const finalLayerAlpha = smoothStep((morph - 0.78) / 0.22);
    rangeFinalWave.style.opacity = String(finalLayerAlpha);
    rangeFinalWave.style.clipPath = `inset(0 ${(1 - reveal) * 100}% 0 0)`;
    rangeMorphWave.style.clipPath = `inset(0 0 0 ${reveal * 100}%)`;
    rangeScreen.style.setProperty("--range-wave-reveal", String(reveal));

    if (!rangeInteractionReady && visual >= RANGE_INTERACTION_READY_PROGRESS)
      setRangeInteractionReady(true);
  }
  function resetRangeOpeningPresentation(): void {
    rangeScreen.classList.remove("range-opening");
    rangeScreen.style.setProperty("--range-chrome-alpha", "1");
    rangeScreen.style.removeProperty("--range-transition-progress");
    rangeScreen.style.removeProperty("--range-wave-reveal");
    rangeMorphWave.style.removeProperty("transform");
    rangeMorphWave.style.removeProperty("clip-path");
    rangeMorphWave.style.removeProperty("--range-morph-progress");
    rangeMorphWave.style.removeProperty("--range-start-scale-x");
    rangeMorphWave.style.removeProperty("--range-start-scale-y");
    rangeFinalWave.style.removeProperty("opacity");
    rangeFinalWave.style.removeProperty("clip-path");
    rangeMorphOval.style.display = "";
    rangeMorphPath.style.display = "none";
    rangeMorphPath.removeAttribute("d");
    rangeWaveRevealStartedAt = null;
    rangeSourceGeometry = null;
  }
  function cancelRangeOpeningMotion(): void {
    ++rangeOpeningEpoch;
    rangeOpening = false;
    setRangeInteractionReady(false);
    rangeMain.inert = false;
    rangeDurationWheel.tabIndex = 0;
    rangeDurationWheel.removeAttribute("aria-disabled");
    rangeScreen.dataset.rangeInteractionReady = "false";
    resetRangeOpeningPresentation();
  }
  function startRangeOpening(): void {
    if (rangeExportPending || rangeOpening) return;
    const blob = blobControl.getBoundingClientRect();
    const viewSize = Math.min(blob.width, blob.height);
    if (viewSize <= 0) return;
    rangeSourceGeometry = {
      centerX: blob.left + blob.width * 0.5,
      centerY: blob.top + blob.height * 0.5,
      bodyDiameter:
        viewSize * 2 * Math.max(0, blobShader.currentBaseRadiusFraction()),
    };
    resetRangeUi();
    currentScreen = "rangeScreen";
    activateScreen("rangeScreen");
    renderRangeFineVisual();
    closeDropdown();
    blobShader.setVisible(false);
    rangeOpening = true;
    rangeScreen.classList.add("range-opening");
    rangeWaveRevealStartedAt = null;
    setRangeInteractionReady(false);
    rangeMain.inert = true;
    const epoch = ++rangeOpeningEpoch;
    const startedAt = performance.now();
    renderRangeOpeningFrame(0, startedAt);
    const frame = (now: number) => {
      if (epoch !== rangeOpeningEpoch || currentScreen !== "rangeScreen") return;
      const raw = clamp01((now - startedAt) / RANGE_OPEN_DURATION_MS);
      const visual = fastOutSlowIn(raw);
      renderRangeOpeningFrame(visual, now);
      if (raw >= 1) {
        rangeOpening = false;
        rangeScreen.classList.remove("range-opening");
      }
      const reveal = Number(
        rangeScreen.style.getPropertyValue("--range-wave-reveal") || 0,
      );
      if (raw < 1 || reveal < 0.999) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  ["pointerdown", "click", "wheel", "keydown"].forEach((type) => {
    rangeMain.addEventListener(
      type,
      (event) => {
        if (rangeInteractionReady) return;
        event.preventDefault();
        event.stopImmediatePropagation();
      },
      true,
    );
  });

  function formatRangeTime(seconds: number): string {
    const tenths = Math.max(0, Math.floor((Number.isFinite(seconds) ? seconds : 0) * 10));
    const h = Math.floor(tenths / 36000);
    const m = Math.floor((tenths % 36000) / 600);
    const s = Math.floor((tenths % 600) / 10);
    const t = tenths % 10;
    return h > 0
      ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${t}`
      : `${m}:${String(s).padStart(2, "0")}.${t}`;
  }
  function parseRangeTime(value: string): number | null {
    const parts = value.trim().split(":");
    if (
      parts.length < 1 ||
      parts.length > 3 ||
      parts.some((part) => part.length === 0)
    )
      return null;
    const secondsPart = Number(parts.at(-1));
    if (
      !Number.isFinite(secondsPart) ||
      secondsPart < 0 ||
      (parts.length > 1 && secondsPart >= 60)
    )
      return null;
    const minuteText = parts.length >= 2 ? parts[parts.length - 2] ?? "" : "0";
    const minutes = /^\d+$/.test(minuteText) ? Number(minuteText) : Number.NaN;
    if (
      !Number.isSafeInteger(minutes) ||
      minutes < 0 ||
      (parts.length === 3 && minutes >= 60)
    )
      return null;
    const hourText = parts.length === 3 ? parts[0] ?? "" : "0";
    const hours = /^\d+$/.test(hourText) ? Number(hourText) : Number.NaN;
    if (!Number.isSafeInteger(hours) || hours < 0) return null;
    const result = hours * 3600 + minutes * 60 + secondsPart;
    return Number.isFinite(result) ? result : null;
  }
  const rangeSelectionSeconds = () =>
    Math.max(0, rangeEndSeconds - rangeStartSeconds);
  const rangeWheelStepSeconds = () =>
    rangeWheelProfileIndex === 1 ? 5 : rangeWheelProfileIndex === 2 ? 15 : 1;
  const splitRangeWholeSeconds = (seconds: number) => {
    const whole = Math.max(0, Math.floor(seconds));
    return {
      hours: Math.floor(whole / 3600),
      minutes: Math.floor((whole % 3600) / 60),
      seconds: whole % 60,
    };
  };
  const twoDigits = (value: number) => String(value).padStart(2, "0");
  const rangeInputEdited = new WeakSet<HTMLElement>();
  const rangeInputText = (input: HTMLElement) => input.textContent ?? "";
  const setRangeInputText = (input: HTMLElement, value: string) => {
    if (input.textContent !== value) input.textContent = value;
  };
  const rangeInvalidTimers = new Map<HTMLElement, number>();
  const clearRangeInputInvalid = (input: HTMLElement) => {
    const timer = rangeInvalidTimers.get(input);
    if (timer != null) clearTimeout(timer);
    rangeInvalidTimers.delete(input);
    input.classList.remove("invalid-flash");
    input.removeAttribute("aria-invalid");
  };
  const flashRangeInputInvalid = (input: HTMLElement) => {
    const previous = rangeInvalidTimers.get(input);
    if (previous != null) clearTimeout(previous);
    input.setAttribute("aria-invalid", "true");
    input.classList.add("invalid-flash");
    rangeInvalidTimers.set(
      input,
      setTimeout(() => {
        input.classList.remove("invalid-flash");
        rangeInvalidTimers.delete(input);
      }, 650),
    );
  };

  const rangeExportLimitSeconds = () => {
    const [channelLabel = "Mono", sampleFormatLabel = "16-bit integer", rateLabel = "44.1 kHz"] =
      settingsInitial.dropdowns;
    const channelCount = channelLabel === "Stereo" ? 2 : 1;
    const bytesPerSample = sampleFormatLabel === "8-bit integer"
      ? 1
      : sampleFormatLabel === "32-bit float"
        ? 4
        : 2;
    const wavHeaderBytes = sampleFormatLabel === "32-bit float" ? 58 : 44;
    const rateKhz = Number.parseFloat(rateLabel);
    const sampleRate = Number.isFinite(rateKhz) && rateKhz > 0
      ? Math.round(rateKhz * 1000)
      : 44_100;
    const frameBytes = channelCount * bytesPerSample;
    const physicalFileLimitBytes = 0xffff_ffff + 8;
    const payloadBudget = Math.max(
      0,
      physicalFileLimitBytes - wavHeaderBytes - (bytesPerSample === 1 ? 1 : 0),
    );
    const frameAlignedPayload = payloadBudget - (payloadBudget % frameBytes);
    return frameAlignedPayload / (sampleRate * frameBytes);
  };
  const rangeWheelReachableSeconds = (target: RangeEditTarget) =>
    target === "start"
      ? rangeEndSeconds
      : Math.max(0, rangeTimelineDurationSeconds - rangeStartSeconds);
  const rangeWheelMaximumSeconds = (
    target: RangeEditTarget = rangeWheelPinnedTarget ?? rangeEditTarget,
  ) => Math.min(rangeWheelReachableSeconds(target), rangeExportLimitSeconds());
  const rangeSelectionWithinExportLimit = () =>
    rangeSelectionSeconds() <= rangeExportLimitSeconds();
  const rangeWheelValues = (
    step: number,
    maxInclusive: number,
    currentValue: number,
    includeMaximumBoundary = true,
  ) => {
    const max = Math.max(0, Math.floor(maxInclusive));
    const current = Math.max(0, Math.floor(currentValue));
    const values: number[] = [];
    for (let value = 0; value <= max; value += step) values.push(value);
    if (includeMaximumBoundary && values.at(-1) !== max) values.push(max);
    if (!values.includes(current)) values.push(current);
    return [...new Set(values)].sort((a, b) => a - b);
  };
  const rangeWheelFaces = (values: readonly number[], current: number) => {
    const index = Math.max(0, values.indexOf(current));
    return [-2, -1, 0, 1, 2].map((offset) => {
      const raw = (index + offset) % values.length;
      return values[(raw + values.length) % values.length] ?? current;
    });
  };
  const rangeWheelNumberModel = (
    target: RangeEditTarget = rangeWheelPinnedTarget ?? rangeEditTarget,
  ) => {
    const selection = rangeSelectionSeconds();
    const maximum = rangeWheelMaximumSeconds(target);
    const displaySelection = selection > maximum
      ? Math.ceil(selection)
      : Math.floor(selection);
    const parts = splitRangeWholeSeconds(displaySelection);
    const maximumParts = splitRangeWholeSeconds(maximum);
    const profileStep = rangeWheelStepSeconds();
    const minuteConstrained = parts.hours === maximumParts.hours;
    const minuteMax = minuteConstrained ? maximumParts.minutes : 59;
    const secondConstrained =
      minuteConstrained && parts.minutes === maximumParts.minutes;
    const secondMax = secondConstrained ? maximumParts.seconds : 59;
    const rings = [
      rangeWheelValues(1, maximumParts.hours, parts.hours),
      rangeWheelValues(
        profileStep,
        minuteMax,
        parts.minutes,
        minuteConstrained,
      ),
      rangeWheelValues(
        profileStep,
        secondMax,
        parts.seconds,
        secondConstrained,
      ),
    ] as const;
    return { maximum, parts, maximumParts, rings };
  };

  const rangeWheelModulo = (value: number, count: number) => {
    const result = value % count;
    return result < 0 ? result + count : result;
  };
  const rangeWheelRoundTiesToEven = (value: number) => {
    const lower = Math.floor(value);
    const fraction = value - lower;
    if (fraction < 0.5) return lower;
    if (fraction > 0.5) return lower + 1;
    return lower % 2 === 0 ? lower : lower + 1;
  };
  const rangeWheelCurrentIndex = (
    column: RangeWheelColumn,
    target: RangeEditTarget,
  ) => {
    if (column === "profile") return rangeWheelProfileIndex;
    const { parts, rings } = rangeWheelNumberModel(target);
    const columnIndex = column === "hour" ? 0 : column === "minute" ? 1 : 2;
    const values = rings[columnIndex];
    const currentParts = [parts.hours, parts.minutes, parts.seconds];
    return Math.max(0, values.indexOf(currentParts[columnIndex] ?? 0));
  };
  const rangeWheelSnapRows = (
    column: RangeWheelColumn,
    rows: number,
    target: RangeEditTarget,
  ) => {
    const currentIndex = rangeWheelCurrentIndex(column, target);
    return rangeWheelRoundTiesToEven(currentIndex + rows) - currentIndex;
  };
  const clearRangeWheelDragVisual = () => {
    const restingTop = [27.54, 44.46, 79.25, 114.05, 130.97];
    rangeDurationWheel.querySelectorAll<HTMLElement>(".wheel-face").forEach((face, index) => {
      face.style.removeProperty("transition");
      face.style.top = `${restingTop[index % 5] ?? 79.25}px`;
      face.style.removeProperty("opacity");
      face.style.removeProperty("transform");
      face.style.removeProperty("color");
    });
  };
  const renderRangeWheelDragVisual = (
    column: RangeWheelColumn,
    rows: number,
    settling = false,
    target: RangeEditTarget = rangeWheelPinnedTarget ?? rangeEditTarget,
  ) => {
    const positionFace = (face: HTMLElement, relative: number, overLimit: boolean) => {
      const radians = relative * 42 * Math.PI / 180;
      const sine = Math.sin(radians);
      const cosine = Math.cos(radians);
      const absolute = Math.abs(relative);
      const z = cosine * 52 - 52;
      const projectionScale = 320 / (320 - z);
      const scale = projectionScale * (1 - Math.min(absolute, 1.5) * 0.05);
      const edgeFade = Math.max(0, Math.min(1, (2.34 - absolute) / 0.42));
      const facing = Math.max(cosine, 0.18);
      const opacity = cosine <= 0 || absolute >= 2.34
        ? 0
        : Math.min(1, facing * (0.55 + edgeFade * 0.45));
      const centerMix = Math.max(0, Math.min(1, 1 - absolute / 0.85));
      face.style.transition = settling
        ? "top 150ms cubic-bezier(.33,1,.68,1), transform 150ms cubic-bezier(.33,1,.68,1), opacity 150ms linear"
        : "none";
      face.style.top = `${79.25 + sine * 52}px`;
      face.style.opacity = String(opacity);
      face.style.transform = `translate(-50%,-50%) scale(${scale},${scale * cosine})`;
      face.style.color = overLimit
        ? "var(--error)"
        : `color-mix(in srgb, var(--on-surface-variant) ${(1 - centerMix) * 100}%, var(--on-surface) ${centerMix * 100}%)`;
    };

    if (column === "profile") {
      const faces = [...rangeDurationWheel.querySelectorAll<HTMLElement>(".wheel-profile")];
      const position = rangeWheelProfileIndex + rows;
      const base = Math.floor(position);
      faces.forEach((face, faceIndex) => {
        const logical = base + faceIndex - 2;
        face.textContent = rangeWheelProfiles[rangeWheelModulo(logical, rangeWheelProfiles.length)] ?? "1x";
        positionFace(face, logical - position, false);
      });
      return;
    }

    const { maximum, parts, rings } = rangeWheelNumberModel(target);
    const columnIndex = column === "hour" ? 0 : column === "minute" ? 1 : 2;
    const values = rings[columnIndex];
    if (values.length === 0) return;
    const currentParts = [parts.hours, parts.minutes, parts.seconds];
    const current = currentParts[columnIndex] ?? 0;
    const currentIndex = Math.max(0, values.indexOf(current));
    const position = currentIndex + rows;
    const base = Math.floor(position);
    const selectedLogical = rangeWheelRoundTiesToEven(position);
    const selectedParts = [...currentParts];
    selectedParts[columnIndex] = values[rangeWheelModulo(selectedLogical, values.length)] ?? current;
    const faces = [...rangeDurationWheel.querySelectorAll<HTMLElement>(
      ".wheel-face:not(.wheel-profile)",
    )].slice(columnIndex * 5, columnIndex * 5 + 5);
    faces.forEach((face, faceIndex) => {
      const logical = base + faceIndex - 2;
      const value = values[rangeWheelModulo(logical, values.length)] ?? current;
      face.textContent = twoDigits(value);
      const candidate = [...selectedParts];
      candidate[columnIndex] = value;
      const candidateSeconds =
        (candidate[0] ?? 0) * 3600 +
        (candidate[1] ?? 0) * 60 +
        (candidate[2] ?? 0);
      positionFace(face, logical - position, candidateSeconds > maximum);
    });
  };

  const rangeWheelSettleRows = (
    settling: NonNullable<typeof rangeWheelSettle>,
    now = performance.now(),
  ) => {
    const elapsed = Math.max(0, Math.min(1, (now - settling.startedAt) / 150));
    const eased = 1 - (1 - elapsed) ** 3;
    return settling.startRows +
      (settling.targetRows - settling.startRows) * eased;
  };
  const animateRangeWheelSettle = (
    settling: NonNullable<typeof rangeWheelSettle>,
  ) => {
    const frame = (now: number) => {
      if (rangeWheelSettle !== settling) return;
      renderRangeWheelDragVisual(
        settling.column,
        rangeWheelSettleRows(settling, now),
        false,
        settling.target,
      );
      if (now - settling.startedAt < 150) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  };

  function renderRangeWheel(): void {
    const selection = rangeSelectionSeconds();
    const { maximum, parts, rings } = rangeWheelNumberModel();
    const numberFaces = [
      ...rangeDurationWheel.querySelectorAll<HTMLElement>(
        ".wheel-face:not(.wheel-profile)",
      ),
    ];
    const currentParts = [parts.hours, parts.minutes, parts.seconds];
    const maximumWhole = Math.max(0, Math.floor(maximum));
    const selectedError = (() => {
      const max = splitRangeWholeSeconds(maximumWhole);
      if (parts.hours > max.hours) return [true, true, true] as const;
      if (parts.hours < max.hours) return [false, false, false] as const;
      if (parts.minutes > max.minutes) return [false, true, true] as const;
      if (parts.minutes < max.minutes) return [false, false, false] as const;
      if (parts.seconds > max.seconds) return [false, false, true] as const;
      return [false, false, false] as const;
    })();
    rings.forEach((ring, column) => {
      const current = currentParts[column] ?? 0;
      rangeWheelFaces(ring, current).forEach((value, faceIndex) => {
        const face = numberFaces[column * 5 + faceIndex];
        if (!face) return;
        face.textContent = twoDigits(value);
        const candidate = [...currentParts];
        candidate[column] = value;
        const candidateSeconds =
          (candidate[0] ?? 0) * 3600 +
          (candidate[1] ?? 0) * 60 +
          (candidate[2] ?? 0);
        const overLimit = faceIndex === 2
          ? (selectedError[column] ?? false)
          : candidateSeconds > maximum;
        face.classList.toggle("over-limit", overLimit);
      });
    });
    const colons = [
      ...rangeDurationWheel.querySelectorAll<HTMLElement>(".wheel-colon"),
    ];
    colons[0]?.classList.toggle("over-limit", selectedError[0]);
    colons[1]?.classList.toggle(
      "over-limit",
      selectedError[0] || selectedError[1],
    );
    const profileFaces = [
      ...rangeDurationWheel.querySelectorAll<HTMLElement>(".wheel-profile"),
    ];
    [-2, -1, 0, 1, 2].forEach((offset, index) => {
      const raw = (rangeWheelProfileIndex + offset) % rangeWheelProfiles.length;
      const profile = rangeWheelProfiles[(raw + rangeWheelProfiles.length) %
        rangeWheelProfiles.length] ?? "1x";
      const face = profileFaces[index];
      if (face) face.textContent = profile;
    });
    rangeDurationWheel.setAttribute("aria-valuemin", "0.05");
    rangeDurationWheel.setAttribute("aria-valuemax", String(maximum));
    rangeDurationWheel.setAttribute(
      "aria-valuenow",
      String(Math.round(selection * 10) / 10),
    );
    rangeDurationWheel.setAttribute(
      "aria-valuetext",
      `${parts.hours}:${twoDigits(parts.minutes)}:${twoDigits(parts.seconds)} ${
        rangeWheelProfiles[rangeWheelProfileIndex] ?? "1x"
      }`,
    );
    rangeExportButton.disabled =
      rangeWheelInteractionActive() || !rangeSelectionWithinExportLimit();
  }
  function renderRangeUi(): void {
    const duration = Math.max(0.1, rangeTimelineDurationSeconds);
    const startFraction = Math.max(
      0,
      Math.min(1, rangeStartSeconds / duration),
    );
    const endFraction = Math.max(0, Math.min(1, rangeEndSeconds / duration));
    setRangeInputText(rangeStartInput, formatRangeTime(rangeStartSeconds));
    setRangeInputText(rangeEndInput, formatRangeTime(rangeEndSeconds));
    clearRangeInputInvalid(rangeStartInput);
    clearRangeInputInvalid(rangeEndInput);
    byId("rangeDurationLabel").textContent = formatRangeTime(duration);

    const timelineWidth = 375;
    const timelineInset = 12;
    const waveformWidth = timelineWidth - timelineInset * 2;
    const bubbleWidth = 100;
    const bubbleLeftFor = (fraction: number) => {
      const markerX = timelineInset + waveformWidth * fraction;
      return Math.max(
        0,
        Math.min(timelineWidth - bubbleWidth, markerX - bubbleWidth / 2),
      );
    };
    rangeStartInput.style.left = `${bubbleLeftFor(startFraction)}px`;
    rangeEndInput.style.left = `${bubbleLeftFor(endFraction)}px`;
    rangeEndInput.style.right = "auto";
    rangeStartBoundary.style.left = `${startFraction * 100}%`;
    rangeEndBoundary.style.left = `${endFraction * 100}%`;
    const selectedRect = byId<SVGRectElement>("selectedWaveRect");
    const clipX = 360 * startFraction;
    const clipEnd = 360 * endFraction;
    selectedRect.setAttribute("x", clipX.toFixed(2));
    selectedRect.setAttribute(
      "width",
      Math.max(0, clipEnd - clipX).toFixed(2),
    );
    rangeStartInput.classList.toggle("active", rangeEditTarget === "start");
    rangeEndInput.classList.toggle("active", rangeEditTarget === "end");
    rangeStartBoundary.classList.toggle("active", rangeEditTarget === "start");
    rangeEndBoundary.classList.toggle("active", rangeEditTarget === "end");

    const loop = rangeBuffer === "loop";
    byId("rangeBufferLabel").textContent = loop ? "Looping" : "One-shot";
    byId<SVGUseElement>("rangeBufferIcon").setAttribute(
      "href",
      loop ? "#i-loop" : "#i-one",
    );
    renderRangeWheel();
  }
  function resetRangeUi(): void {
    rangeBuffer = bufferRenderedBuffer();
    rangeTimelineDurationSeconds = Math.max(0.1, currentSeconds(rangeBuffer));
    const remembered = rememberedRangeExports[rangeBuffer];
    const selection = Math.min(
      remembered.selectionSeconds,
      rangeTimelineDurationSeconds,
    );
    if (remembered.selectionSeconds >= rangeTimelineDurationSeconds) {
      rangeStartSeconds = 0;
      rangeEndSeconds = rangeTimelineDurationSeconds;
    } else {
      const maxEndOffset = rangeTimelineDurationSeconds - selection;
      const endOffset = Math.max(
        0,
        Math.min(maxEndOffset, remembered.endOffsetSeconds),
      );
      rangeEndSeconds = rangeTimelineDurationSeconds - endOffset;
      rangeStartSeconds = Math.max(0, rangeEndSeconds - selection);
    }
    rangeEditTarget = "start";
    rangeWheelProfileIndex = 0;
    renderRangeUi();
  }
  function setRangeEditTarget(target: RangeEditTarget): void {
    if (rangeWheelInteractionActive()) rangeWheelCommitAllowed = false;
    rangeEditTarget = target;
    renderRangeUi();
  }
  function adjustRangeTarget(
    target: RangeEditTarget,
    requestedSeconds: number,
  ): void {
    const duration = Math.max(0, rangeTimelineDurationSeconds);
    const minimum = Math.min(0.05, duration);
    let start = Math.max(0, Math.min(duration, rangeStartSeconds));
    let end = Math.max(start, Math.min(duration, rangeEndSeconds));
    if (end - start < minimum) {
      end = Math.min(duration, start + minimum);
      start = Math.max(0, end - minimum);
    }
    if (target === "start") {
      const requested = Math.max(
        0,
        Math.min(Math.max(0, duration - minimum), requestedSeconds),
      );
      if (requested > end - minimum) {
        start = requested;
        end = Math.min(duration, start + minimum);
      } else {
        start = requested;
      }
    } else {
      const requested = Math.max(
        Math.min(minimum, duration),
        Math.min(duration, requestedSeconds),
      );
      if (requested < start + minimum) {
        end = requested;
        start = Math.max(0, end - minimum);
      } else {
        end = requested;
      }
    }
    rangeStartSeconds = start;
    rangeEndSeconds = end;
    rangeEditTarget = target;
    renderRangeUi();
  }
  function resizeRangeSelection(
    requestedSeconds: number,
    target: RangeEditTarget = rangeEditTarget,
  ): void {
    const duration = Math.max(0, rangeTimelineDurationSeconds);
    const minimum = Math.min(0.05, duration);
    const requested = Math.max(
      minimum,
      Math.min(rangeWheelReachableSeconds(target), requestedSeconds),
    );
    if (target === "start") {
      rangeStartSeconds = Math.max(
        0,
        Math.min(
          Math.max(0, rangeEndSeconds - minimum),
          rangeEndSeconds - requested,
        ),
      );
    } else {
      rangeEndSeconds = Math.max(
        Math.min(duration, rangeStartSeconds + minimum),
        Math.min(duration, rangeStartSeconds + requested),
      );
    }
    renderRangeUi();
  }
  function commitRangeInput(
    input: HTMLElement,
    target: RangeEditTarget,
  ): boolean {
    const parsed = parseRangeTime(rangeInputText(input));
    if (parsed == null) {
      flashRangeInputInvalid(input);
      return false;
    }
    adjustRangeTarget(target, parsed);
    rangeInputEdited.delete(input);
    return true;
  }
  (
    [
      [rangeStartInput, "start"],
      [rangeEndInput, "end"],
    ] as const
  ).forEach(([input, target]) => {
    input.addEventListener("focus", () => {
      if (input.getAttribute("aria-invalid") === "true") return;
      const other = target === "start" ? rangeEndInput : rangeStartInput;
      if (other.getAttribute("aria-invalid") === "true") {
        requestAnimationFrame(() => {
          if (other.isConnected) other.focus({ preventScroll: true });
        });
        return;
      }
      rangeInputEdited.delete(input);
      setRangeEditTarget(target);
      setRangePlaying(false);
    });
    input.addEventListener("input", () => {
      clearRangeInputInvalid(input);
      rangeInputEdited.add(input);
    });
    input.addEventListener("blur", () => {
      const other = target === "start" ? rangeEndInput : rangeStartInput;
      if (other.getAttribute("aria-invalid") === "true") return;
      if (!rangeInputEdited.has(input)) return;
      commitRangeInput(input, target);
    });
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        if (commitRangeInput(input, target)) input.blur();
      } else if (event.key === "Escape") {
        event.preventDefault();
        renderRangeUi();
        input.blur();
      }
    });
  });

  let rangeWavePointerId = -1;
  let rangeWaveTarget: RangeEditTarget | null = null;
  let rangeWaveResumeAfterScrub = false;
  let rangeWaveBoundaryMode = false;
  let rangeWaveBoundaryDragging = false;
  let rangeWaveBoundaryDownX = 0;
  let rangeWaveBoundaryOriginSeconds = 0;
  const cancelRangeWaveScrub = (resumePreview: boolean) => {
    const pointerId = rangeWavePointerId;
    if (pointerId === -1) return;
    rangeWavePointerId = -1;
    rangeWaveTarget = null;
    rangeWaveBoundaryMode = false;
    rangeWaveBoundaryDragging = false;
    const shouldResumePreview = resumePreview && rangeWaveResumeAfterScrub;
    rangeWaveResumeAfterScrub = false;
    if (rangeWavebox.hasPointerCapture?.(pointerId)) rangeWavebox.releasePointerCapture(pointerId);
    if (shouldResumePreview) setRangePlaying(true);
  };
  rangeWavebox.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (rangeWavePointerId !== -1) return;
    if (rangeWheelInteractionActive()) return;
    const path = event.composedPath();
    const boundaryTarget: RangeEditTarget | null = path.includes(rangeEndBoundary)
      ? "end"
      : path.includes(rangeStartBoundary)
        ? "start"
        : null;
    const target = boundaryTarget ?? rangeEditTarget;
    rangeEditTarget = target;
    rangeWaveTarget = target;
    renderRangeUi();
    rangeStartInput.blur();
    rangeEndInput.blur();
    rangeWavePointerId = event.pointerId;
    rangeWavebox.setPointerCapture?.(event.pointerId);
    event.preventDefault();
    if (boundaryTarget) {
      rangeWaveBoundaryMode = true;
      rangeWaveBoundaryDragging = false;
      rangeWaveBoundaryDownX = event.clientX;
      rangeWaveBoundaryOriginSeconds = target === "start" ? rangeStartSeconds : rangeEndSeconds;
      rangeWaveResumeAfterScrub = false;
      return;
    }
    rangeWaveBoundaryMode = false;
    rangeWaveResumeAfterScrub = rangePlaying;
    if (rangePlaying) setRangePlaying(false);
    const rect = rangeWavebox.getBoundingClientRect();
    const seconds =
      ((event.clientX - rect.left) / Math.max(1, rect.width)) *
      rangeTimelineDurationSeconds;
    adjustRangeTarget(target, seconds);
  });
  rangeWavebox.addEventListener("pointermove", (event) => {
    if (event.pointerId !== rangeWavePointerId) return;
    const rect = rangeWavebox.getBoundingClientRect();
    const target = rangeWaveTarget ?? rangeEditTarget;
    if (rangeWaveBoundaryMode) {
      const deltaX = event.clientX - rangeWaveBoundaryDownX;
      const dragSlop = Math.max(1, rect.width * (8 / 351));
      if (!rangeWaveBoundaryDragging && Math.abs(deltaX) > dragSlop) {
        rangeWaveBoundaryDragging = true;
        rangeWaveResumeAfterScrub = rangePlaying;
        if (rangePlaying) setRangePlaying(false);
      }
      if (rangeWaveBoundaryDragging) {
        const requested = rangeWaveBoundaryOriginSeconds +
          (deltaX / Math.max(1, rect.width)) * rangeTimelineDurationSeconds;
        adjustRangeTarget(target, requested);
      }
      event.preventDefault();
      return;
    }
    const seconds =
      ((event.clientX - rect.left) / Math.max(1, rect.width)) *
      rangeTimelineDurationSeconds;
    adjustRangeTarget(target, seconds);
  });
  const endRangeWavePointer = (event: PointerEvent) => {
    if (event.pointerId !== rangeWavePointerId) return;
    const boundaryClick = rangeWaveBoundaryMode && !rangeWaveBoundaryDragging;
    if (boundaryClick) {
      rangeWaveResumeAfterScrub = false;
      setRangePlaying(false);
    }
    cancelRangeWaveScrub(!boundaryClick);
  };
  rangeWavebox.addEventListener("pointerup", endRangeWavePointer);
  rangeWavebox.addEventListener("pointercancel", endRangeWavePointer);
  rangeWavebox.addEventListener("lostpointercapture", (event) => {
    if (event.pointerId === rangeWavePointerId) endRangeWavePointer(event);
  });

  const adjustRangeWheel = (
    deltaSeconds: number,
    target: RangeEditTarget = rangeEditTarget,
  ) => {
    resizeRangeSelection(rangeSelectionSeconds() + deltaSeconds, target);
  };
  const cycleRangeWheelProfile = (direction: number) => {
    rangeWheelProfileIndex =
      (rangeWheelProfileIndex +
        direction +
        rangeWheelProfiles.length) %
      rangeWheelProfiles.length;
    renderRangeWheel();
  };
  const rangeWheelColumnAt = (clientX: number): RangeWheelColumn | null => {
    const rect = rangeDurationWheel.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const x = Math.max(0, Math.min(width, clientX - rect.left));
    const profileStart = width * 0.81;
    if (x >= profileStart) return "profile";
    const separatorGap = width * (14 / 327);
    const timeRight = Math.max(1, profileStart - separatorGap);
    if (x > timeRight) return null;
    const columnWidth = timeRight / 3;
    const hitHalfWidth = columnWidth * 0.4;
    const centers = [columnWidth * 0.5, columnWidth * 1.5, columnWidth * 2.5];
    if (Math.abs(x - centers[0]!) <= hitHalfWidth) return "hour";
    if (Math.abs(x - centers[1]!) <= hitHalfWidth) return "minute";
    if (Math.abs(x - centers[2]!) <= hitHalfWidth) return "second";
    return null;
  };
  const adjustRangeWheelColumn = (
    column: RangeWheelColumn,
    direction: number,
    target: RangeEditTarget = rangeEditTarget,
  ) => {
    if (column === "profile") {
      cycleRangeWheelProfile(direction);
      return;
    }
    const { parts, rings } = rangeWheelNumberModel(target);
    const columnIndex = column === "hour" ? 0 : column === "minute" ? 1 : 2;
    const values = rings[columnIndex];
    const currentParts = [parts.hours, parts.minutes, parts.seconds];
    const current = currentParts[columnIndex] ?? 0;
    const currentIndex = Math.max(0, values.indexOf(current));
    const count = values.length;
    if (count === 0) return;
    const rawIndex = (currentIndex + direction) % count;
    const nextIndex = (rawIndex + count) % count;
    currentParts[columnIndex] = values[nextIndex] ?? current;
    resizeRangeSelection(
      (currentParts[0] ?? 0) * 3600 +
        (currentParts[1] ?? 0) * 60 +
        (currentParts[2] ?? 0),
      target,
    );
  };
  const adjustRangeWheelAt = (clientX: number, direction: number) => {
    const column = rangeWheelColumnAt(clientX);
    if (column) adjustRangeWheelColumn(column, direction);
  };
  const setRangeWheelInteractionUi = (active: boolean) => {
    rangeExportButton.disabled = active || !rangeSelectionWithinExportLimit();
    byId<HTMLButtonElement>("rangePlay").disabled = active;
    rangeDurationWheel.toggleAttribute("data-editing", active);
  };
  const cancelRangeWheelInteraction = () => {
    if (rangeWheelSettleTimer !== 0) clearTimeout(rangeWheelSettleTimer);
    const pointerId = rangeWheelPointerId;
    rangeWheelSettleTimer = 0;
    rangeWheelSettle = null;
    rangeWheelPointerId = -1;
    rangeWheelPointerColumn = null;
    rangeWheelPinnedTarget = null;
    rangeWheelPointerOriginRows = 0;
    rangeWheelPointerDragged = false;
    rangeWheelCommitAllowed = false;
    if (pointerId !== -1) {
      rangeWheelSuppressClick = true;
      setTimeout(() => {
        rangeWheelSuppressClick = false;
      }, 500);
    }
    if (pointerId !== -1 && rangeDurationWheel.hasPointerCapture?.(pointerId))
      rangeDurationWheel.releasePointerCapture(pointerId);
    clearRangeWheelDragVisual();
    renderRangeWheel();
    setRangeWheelInteractionUi(false);
  };
  const finishRangeWheelInteraction = (event: PointerEvent, cancelled = false) => {
    if (event.pointerId !== rangeWheelPointerId) return;
    const pointerId = rangeWheelPointerId;
    const column = rangeWheelPointerColumn;
    const pinnedTarget = rangeWheelPinnedTarget;
    const rect = rangeDurationWheel.getBoundingClientRect();
    const rowPx = Math.max(1, rect.height * (56 / 160));
    const pointerDeltaRows = rangeWheelPointerDragged
      ? -(rangeWheelPointerY - rangeWheelPointerDownY) / rowPx
      : cancelled
        ? 0
        : event.clientY - rect.top < rect.height / 3
          ? -1
          : event.clientY - rect.top > (rect.height * 2) / 3
            ? 1
            : 0;
    const rawSteps = rangeWheelPointerOriginRows + pointerDeltaRows;
    const steps = column && pinnedTarget
      ? rangeWheelSnapRows(column, rawSteps, pinnedTarget)
      : Math.round(rawSteps);
    const needsSettle = Math.abs(steps - rawSteps) > 0.0001;
    rangeWheelPointerId = -1;
    rangeWheelPointerColumn = null;
    rangeWheelPinnedTarget = null;
    rangeWheelPointerOriginRows = 0;
    rangeWheelPointerDragged = false;
    rangeWheelSuppressClick = true;
    setTimeout(() => {
      rangeWheelSuppressClick = false;
    }, cancelled ? 500 : 0);
    if (rangeDurationWheel.hasPointerCapture?.(pointerId))
      rangeDurationWheel.releasePointerCapture(pointerId);
    const commit = () => {
      rangeWheelSettleTimer = 0;
      rangeWheelSettle = null;
      clearRangeWheelDragVisual();
      if (rangeWheelCommitAllowed && column && pinnedTarget && steps !== 0)
        adjustRangeWheelColumn(column, steps, pinnedTarget);
      else
        renderRangeWheel();
      rangeWheelCommitAllowed = false;
      setRangeWheelInteractionUi(false);
    };
    if (needsSettle) {
      if (column && pinnedTarget) {
        const settling = {
          column,
          target: pinnedTarget,
          startRows: rawSteps,
          targetRows: steps,
          startedAt: performance.now(),
        };
        rangeWheelSettle = settling;
        animateRangeWheelSettle(settling);
      }
      rangeWheelSettleTimer = setTimeout(commit, 150);
    } else {
      commit();
    }
  };
  rangeDurationWheel.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (rangeWheelPointerId !== -1) return;
    const column = rangeWheelColumnAt(event.clientX);
    if (!column) return;
    let originRows = 0;
    const settling = rangeWheelSettle;
    if (rangeWheelSettleTimer !== 0 && settling && settling.column === column)
      originRows = rangeWheelSettleRows(settling);
    if (rangeWheelSettleTimer !== 0) clearTimeout(rangeWheelSettleTimer);
    rangeWheelSettleTimer = 0;
    rangeWheelSettle = null;
    rangeWheelPointerId = event.pointerId;
    rangeWheelPointerColumn = column;
    rangeWheelPinnedTarget = rangeEditTarget;
    rangeWheelPointerDownY = event.clientY;
    rangeWheelPointerY = event.clientY;
    rangeWheelPointerOriginRows = originRows;
    rangeWheelPointerDragged = false;
    rangeWheelCommitAllowed = true;
    renderRangeUi();
    if (originRows !== 0)
      renderRangeWheelDragVisual(column, originRows, false, rangeEditTarget);
    setRangePlaying(false);
    setRangeWheelInteractionUi(true);
    rangeDurationWheel.focus({ preventScroll: true });
    try {
      rangeDurationWheel.setPointerCapture?.(event.pointerId);
    } catch {
      // Synthetic PointerEvents have no browser-owned pointer to capture.
    }
    event.preventDefault();
  });
  rangeDurationWheel.addEventListener("pointermove", (event) => {
    if (event.pointerId !== rangeWheelPointerId) return;
    rangeWheelPointerY = event.clientY;
    if (Math.abs(rangeWheelPointerY - rangeWheelPointerDownY) > 8)
      rangeWheelPointerDragged = true;
    const column = rangeWheelPointerColumn;
    if (column) {
      const rect = rangeDurationWheel.getBoundingClientRect();
      const rowPx = Math.max(1, rect.height * (56 / 160));
      renderRangeWheelDragVisual(
        column,
        rangeWheelPointerOriginRows -
          (rangeWheelPointerY - rangeWheelPointerDownY) / rowPx,
      );
    }
    event.preventDefault();
  });
  rangeDurationWheel.addEventListener("pointerup", finishRangeWheelInteraction);
  rangeDurationWheel.addEventListener("pointercancel", (event) =>
    finishRangeWheelInteraction(event, true));
  rangeDurationWheel.addEventListener("lostpointercapture", (event) => {
    if (event.pointerId === rangeWheelPointerId) finishRangeWheelInteraction(event, true);
  });
  rangeDurationWheel.addEventListener("wheel", (event) => {
    if (event.deltaY === 0 || rangeWheelPointerId !== -1) return;
    const column = rangeWheelColumnAt(event.clientX);
    if (!column) return;
    const direction = event.deltaY < 0 ? -1 : 1;
    const settling = rangeWheelSettle;
    if (rangeWheelSettleTimer !== 0 && settling) {
      if (settling.column !== column) return;
      const currentRows = rangeWheelSettleRows(settling);
      clearTimeout(rangeWheelSettleTimer);
      rangeWheelSettleTimer = 0;
      rangeWheelSettle = null;
      clearRangeWheelDragVisual();

      const pinnedTarget = rangeEditTarget;
      rangeWheelCommitAllowed = true;
      renderRangeUi();
      rangeStartInput.blur();
      rangeEndInput.blur();
      setRangePlaying(false);
      setRangeWheelInteractionUi(true);
      event.preventDefault();

      const startRows = currentRows + direction;
      const targetRows = rangeWheelSnapRows(column, startRows, pinnedTarget);
      renderRangeWheelDragVisual(column, startRows, false, pinnedTarget);
      if (Math.abs(targetRows - startRows) < 0.0001) {
        clearRangeWheelDragVisual();
        if (targetRows !== 0) adjustRangeWheelColumn(column, targetRows, pinnedTarget);
        else renderRangeWheel();
        rangeWheelCommitAllowed = false;
        setRangeWheelInteractionUi(false);
        return;
      }

      const nextSettle = {
        column,
        target: pinnedTarget,
        startRows,
        targetRows,
        startedAt: performance.now(),
      };
      rangeWheelSettle = nextSettle;
      animateRangeWheelSettle(nextSettle);
      rangeWheelSettleTimer = setTimeout(() => {
        rangeWheelSettleTimer = 0;
        rangeWheelSettle = null;
        clearRangeWheelDragVisual();
        if (rangeWheelCommitAllowed && targetRows !== 0)
          adjustRangeWheelColumn(column, targetRows, pinnedTarget);
        else
          renderRangeWheel();
        rangeWheelCommitAllowed = false;
        setRangeWheelInteractionUi(false);
      }, 150);
      return;
    }

    if (rangeWheelInteractionActive()) return;
    const pinnedTarget = rangeEditTarget;
    renderRangeUi();
    rangeStartInput.blur();
    rangeEndInput.blur();
    setRangePlaying(false);
    event.preventDefault();
    adjustRangeWheelColumn(column, direction, pinnedTarget);
  });
  rangeDurationWheel.addEventListener("click", (event) => {
    if (rangeWheelSuppressClick) {
      rangeWheelSuppressClick = false;
      event.preventDefault();
      return;
    }
    if (rangeWheelInteractionActive()) {
      event.preventDefault();
      return;
    }
    const rect = rangeDurationWheel.getBoundingClientRect();
    const y = event.clientY - rect.top;
    const direction =
      y < rect.height / 3 ? -1 : y > (rect.height * 2) / 3 ? 1 : 0;
    if (direction !== 0) adjustRangeWheelAt(event.clientX, direction);
  });
  rangeDurationWheel.addEventListener("keydown", (event) => {
    if (rangeWheelInteractionActive()) return;
    const profileStep = rangeWheelStepSeconds();
    let delta = 0;
    if (event.key === "ArrowUp" || event.key === "ArrowRight")
      delta = profileStep;
    else if (event.key === "ArrowDown" || event.key === "ArrowLeft")
      delta = -profileStep;
    else if (event.key === "PageUp") delta = 60 * profileStep;
    else if (event.key === "PageDown") delta = -60 * profileStep;
    else if (event.key === "Home") {
      event.preventDefault();
      resizeRangeSelection(0.05);
      return;
    } else if (event.key === "End") {
      event.preventDefault();
      resizeRangeSelection(
        rangeEditTarget === "start"
          ? rangeEndSeconds
          : rangeTimelineDurationSeconds - rangeStartSeconds,
      );
      return;
    } else {
      return;
    }
    event.preventDefault();
    adjustRangeWheel(delta);
  });

  const bufferSegments = [
    ...document.querySelectorAll<HTMLButtonElement>(".buffer-segment"),
  ];
  const selectBufferPage = (segment: HTMLButtonElement, focus = false) => {
    if (rangeExportPending) return;
    requestBufferNavigation(bufferSlot(segment.dataset.buffer));
    if (focus) segment.focus({ preventScroll: true });
  };
  bufferSegments.forEach((segment) => {
    segment.addEventListener("click", () => selectBufferPage(segment));
    segment.addEventListener("keydown", (event) => {
      let target: HTMLButtonElement | undefined;
      const index = bufferSegments.indexOf(segment);
      if (event.key === "ArrowRight" || event.key === "ArrowDown")
        target = bufferSegments[(index + 1) % bufferSegments.length];
      else if (event.key === "ArrowLeft" || event.key === "ArrowUp")
        target =
          bufferSegments[(index - 1 + bufferSegments.length) % bufferSegments.length];
      else if (event.key === "Home") target = bufferSegments[0];
      else if (event.key === "End")
        target = bufferSegments[bufferSegments.length - 1];
      else return;
      event.preventDefault();
      if (target) selectBufferPage(target, true);
    });
  });
  blobControl.addEventListener("pointerdown", () =>
    blobControl.classList.add("pressed"),
  );
  ["pointerup", "pointercancel", "pointerleave"].forEach((type) =>
    blobControl.addEventListener(type, () =>
      blobControl.classList.remove("pressed"),
    ),
  );
  blobControl.addEventListener("click", () => {
    if (suppressBlobClick) {
      suppressBlobClick = false;
      return;
    }
    const renderedBuffer = bufferRenderedBuffer();
    if (live && activeBuffer === renderedBuffer) {
      live = false;
      activeBuffer = null;
    } else {
      live = true;
      activeBuffer = renderedBuffer;
    }
    syncBufferUi();
  });
  byId<HTMLButtonElement>("exportFull").addEventListener("click", () => {
    if (rangeExportPending) return;
    beginCaptureExport(currentSeconds(displayedBuffer));
  });
  captureSaveCancel.addEventListener("click", () => {
    if (!rangeExportPending) return;
    const generation = ++rangeExportGeneration;
    clearTimeout(captureExportCompletionTimer);
    captureSaveCancel.disabled = true;
    setTimeout(() => {
      if (generation !== rangeExportGeneration) return;
      rangeExportPending = false;
      syncBufferUi();
      animateCaptureSaveVisibility(false);
    }, 120);
  });

  blobArea.addEventListener("pointerdown", (event) => {
    if (
      currentScreen !== "homeScreen" ||
      rangeExportPending ||
      bufferDragging ||
      bufferTransitionTarget != null
    )
      return;
    bufferSwipePointerId = event.pointerId;
    bufferSwipeStartX = event.clientX;
    bufferSwipeStartY = event.clientY;
  });
  blobArea.addEventListener("pointermove", (event) => {
    if (event.pointerId !== bufferSwipePointerId) return;
    const dx = event.clientX - bufferSwipeStartX;
    const dy = event.clientY - bufferSwipeStartY;
    if (!bufferDragging) {
      if (Math.abs(dx) < 8 || Math.abs(dx) <= Math.abs(dy)) return;
      bufferDragging = true;
      suppressBlobClick = true;
      ++bufferTransitionEpoch;
      bufferTransitionTarget = oppositeBuffer(displayedBuffer);
      bufferTransitionProgress = 0;
      blobControl.classList.remove("pressed");
      try {
        blobArea.setPointerCapture?.(event.pointerId);
      } catch {
        // Synthetic PointerEvents have no browser-owned pointer to capture.
      }
    }
    const width = Math.max(1, blobArea.getBoundingClientRect().width);
    const forward = displayedBuffer === "one" ? -dx : dx;
    bufferTransitionProgress = Math.max(0, Math.min(1, forward / width));
    renderBufferTransition();
    event.preventDefault();
  });
  function finishBufferSwipe(cancelled: boolean): void {
    if (bufferSwipePointerId === -1) return;
    const wasDragging = bufferDragging;
    bufferSwipePointerId = -1;
    if (!wasDragging) return;
    bufferDragging = false;
    const commit =
      !cancelled && bufferTransitionProgress >= BUFFER_SWIPE_COMMIT_PROGRESS;
    if (commit) settleBufferTransition(1, true);
    else if (bufferTransitionProgress <= 0.001) completeBufferTransition(false);
    else settleBufferTransition(0, false);
    setTimeout(() => {
      suppressBlobClick = false;
    }, 0);
  }
  blobArea.addEventListener("pointerup", () => finishBufferSwipe(false));
  blobArea.addEventListener("pointercancel", () => finishBufferSwipe(true));
  blobArea.addEventListener("lostpointercapture", () => {
    if (bufferDragging) finishBufferSwipe(true);
  });

  byId("openSettings").addEventListener("click", openSettings);
  byId("librarySettings").addEventListener("click", (event) => {
    closeLibraryPanel(null);
    openSettings(event);
    settingsReturnScreen = "homeScreen";
    settingsReturnFocus = byId<HTMLElement>("openLibrary");
    settingsForegroundScreen = homeScreen;
    renderSettingsPanelProgress(settingsPanelProgress);
  });
  byId("rangeSettings").addEventListener("click", (event) => {
    endRangeTransientOwnership();
    openSettings(event);
  });
  byId("openIncidents").addEventListener("click", openIncidents);
  byId("libraryIncidents").addEventListener("click", () => {
    incidentsReturnScreen = "homeScreen";
    incidentsReturnFocus = byId<HTMLElement>("openLibrary");
    closeLibraryPanel(null);
    showScreen("incidentsScreen");
  });
  byId("rangeIncidents").addEventListener("click", (event) => {
    endRangeTransientOwnership();
    openIncidents(event);
  });
  byId("openLibrary").addEventListener("click", openLibraryPanel);
  byId("libraryBack").addEventListener("click", () => closeLibraryPanel());
  byId("openRange").addEventListener("click", startRangeOpening);
  const rangeClose = byId<HTMLElement>("rangeClose");
  rangeClose.addEventListener("pointerdown", () => {
    endRangeTransientOwnership();
    renderRangeUi();
  });
  rangeClose.addEventListener("click", () => {
    endRangeTransientOwnership();
    cancelRangeOpeningMotion();
    showScreen("homeScreen", byId<HTMLElement>("openRange"));
  });
  byId("rangeExport").addEventListener("click", () => {
    const activeDraft =
      rangeStartInput.matches(":focus")
        ? ([rangeStartInput, "start"] as const)
        : rangeEndInput.matches(":focus")
          ? ([rangeEndInput, "end"] as const)
          : null;
    if (
      activeDraft &&
      !commitRangeInput(activeDraft[0], activeDraft[1])
    ) {
      activeDraft[0].focus({ preventScroll: true });
      return;
    }
    const invalid = [rangeStartInput, rangeEndInput].find(
      (input) => input.getAttribute("aria-invalid") === "true",
    );
    if (invalid) {
      invalid.focus({ preventScroll: true });
      return;
    }
    const exportedBuffer = rangeBuffer;
    const exportedSelectionSeconds = rangeSelectionSeconds();
    const exportedEndOffsetSeconds = Math.max(
      0,
      rangeTimelineDurationSeconds - rangeEndSeconds,
    );
    endRangeTransientOwnership();
    cancelRangeOpeningMotion();
    showScreen("homeScreen", byId<HTMLElement>("brandButton"));
    beginCaptureExport(exportedSelectionSeconds, () => {
      rememberedRangeExports[exportedBuffer] = {
        selectionSeconds: exportedSelectionSeconds,
        endOffsetSeconds: exportedEndOffsetSeconds,
      };
    });
  });
  byId("incidentsBack").addEventListener("click", () =>
    showScreen(incidentsReturnScreen, incidentsReturnFocus),
  );

  const aboutSheet = byId<HTMLElement>("aboutSheet");
  const ABOUT_EXIT_DURATION_MS = 190;
  let aboutMotionEpoch = 0;
  let aboutReturnFocus: HTMLElement | null = null;
  let aboutBackground:
    | { screen: HTMLElement; inert: boolean; ariaHidden: string | null }
    | null = null;
  const aboutFocusable = () => [...aboutSheet.querySelectorAll<HTMLElement>(
    'a[href],button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])',
  )].filter((element) => element.tabIndex >= 0 && element.getClientRects().length > 0);
  const openAbout = (event: Event) => {
    ++aboutMotionEpoch;
    aboutReturnFocus = event.currentTarget instanceof HTMLElement ? event.currentTarget : aboutReturnFocus;
    if (!aboutBackground) {
      const background = screens.find((screen) => screen.classList.contains("active"));
      if (background) {
        aboutBackground = {
          screen: background,
          inert: background.inert,
          ariaHidden: background.getAttribute("aria-hidden"),
        };
        background.inert = true;
        background.setAttribute("aria-hidden", "true");
      }
    }
    aboutSheet.inert = false;
    aboutSheet.setAttribute("aria-hidden", "false");
    phone.classList.add("about-mounted", "about-open");
    // Native keeps the visualizer hidden for the entire dialog lifetime, including exit.
    syncBufferUi();
    requestAnimationFrame(() => byId<HTMLElement>("aboutClose").focus({ preventScroll: true }));
  };
  const finishAboutDismiss = (epoch: number) => {
    if (epoch !== aboutMotionEpoch || phone.classList.contains("about-open")) return;
    phone.classList.remove("about-mounted");
    aboutSheet.inert = true;
    aboutSheet.setAttribute("aria-hidden", "true");
    if (aboutBackground) {
      const { screen, inert, ariaHidden } = aboutBackground;
      screen.inert = inert;
      if (ariaHidden == null) screen.removeAttribute("aria-hidden");
      else screen.setAttribute("aria-hidden", ariaHidden);
      aboutBackground = null;
    }
    syncBufferUi();
    const target = aboutReturnFocus;
    aboutReturnFocus = null;
    if (target) requestAnimationFrame(() => target.isConnected && target.focus({ preventScroll: true }));
  };
  const closeAbout = () => {
    if (!phone.classList.contains("about-open")) return;
    phone.classList.remove("about-open");
    const epoch = ++aboutMotionEpoch;
    setTimeout(() => finishAboutDismiss(epoch), ABOUT_EXIT_DURATION_MS);
  };
  ["brandButton", "libraryBrand", "rangeBrand"].forEach((id) =>
    byId(id).addEventListener("click", openAbout),
  );
  byId("aboutClose").addEventListener("click", () => closeAbout());
  byId("aboutScrim").addEventListener("click", () => closeAbout());
  document.addEventListener("keydown", (event) => {
    if (!(event instanceof KeyboardEvent) || !phone.classList.contains("about-mounted")) return;
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      closeAbout();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = aboutFocusable();
    if (!focusable.length) return;
    const current = event.target instanceof HTMLElement ? event.target : null;
    const index = current ? focusable.indexOf(current) : -1;
    const next = event.shiftKey
      ? index <= 0 ? focusable[focusable.length - 1] : focusable[index - 1]
      : index < 0 || index === focusable.length - 1 ? focusable[0] : focusable[index + 1];
    event.preventDefault();
    next.focus({ preventScroll: true });
  });
  const incidentCards = [
    ...document.querySelectorAll<HTMLElement>(".incident-card"),
  ];
  const activeIncidentHoldTimers = new Set<number>();
  const syncIncidentAlert = () =>
    setIncidentAlert(
      incidentCards.some((card) => card.dataset.acknowledged === "false"),
    );
  incidentCards.forEach((incidentCard) => {
    const incidentIndicator =
      incidentCard.querySelector<HTMLElement>(".incident-ack");
    const incidentCheckUse =
      incidentCard.querySelector<SVGUseElement>(".incident-ack use");
    if (!incidentIndicator || !incidentCheckUse) return;

    let incidentAcknowledged =
      incidentCard.dataset.acknowledged !== "false";
    let incidentHoldTimer = 0;
    let incidentHoldTriggered = false;
    const incidentCopyText = incidentCard.innerText.trim();
    const syncIncidentState = () => {
      incidentCard.dataset.acknowledged = String(incidentAcknowledged);
      incidentCard.classList.toggle("unread", !incidentAcknowledged);
      incidentCheckUse.setAttribute(
        "href",
        incidentAcknowledged ? "#i-checked" : "#i-unchecked",
      );
      incidentIndicator.setAttribute(
        "aria-label",
        incidentAcknowledged
          ? "Mark incident unchecked"
          : "Mark incident checked",
      );
      syncIncidentAlert();
    };
    const copyIncident = () => {
      incidentHoldTriggered = true;
      void navigator.clipboard
        ?.writeText(incidentCopyText)
        .catch(() => undefined);
      showToast("Incident copied");
    };
    const toggleIncident = () => {
      if (incidentHoldTriggered) {
        incidentHoldTriggered = false;
        return;
      }
      incidentAcknowledged = !incidentAcknowledged;
      syncIncidentState();
    };
    incidentCard.addEventListener("click", toggleIncident);
    incidentCard.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      toggleIncident();
    });
    const clearIncidentHold = () => {
      if (!incidentHoldTimer) return;
      clearTimeout(incidentHoldTimer);
      activeIncidentHoldTimers.delete(incidentHoldTimer);
      incidentHoldTimer = 0;
    };
    incidentCard.addEventListener("pointerdown", () => {
      incidentHoldTriggered = false;
      clearIncidentHold();
      incidentHoldTimer = setTimeout(() => {
        activeIncidentHoldTimers.delete(incidentHoldTimer);
        incidentHoldTimer = 0;
        copyIncident();
      }, 520);
      activeIncidentHoldTimers.add(incidentHoldTimer);
    });
    ["pointerup", "pointercancel", "pointerleave"].forEach((type) =>
      incidentCard.addEventListener(type, clearIncidentHold),
    );
    incidentCard.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      clearIncidentHold();
      copyIncident();
    });
    syncIncidentState();
  });
  syncIncidentAlert();
  document
    .querySelectorAll<HTMLElement>("[data-toast]")
    .forEach((element) =>
      element.addEventListener("click", () =>
        showToast(element.dataset.toast ?? ""),
      ),
    );
  type RecordingPlayerState = {
    card: HTMLElement;
    summary: HTMLButtonElement;
    expanded: HTMLElement;
    player: HTMLElement;
    waveEllipse: SVGEllipseElement;
    wavePath: SVGPathElement;
    waveCursor: HTMLElement;
    positionLabel: HTMLElement;
    durationLabel: HTMLElement;
    fine: HTMLElement;
    fineField: SVGSVGElement;
    finePath: SVGPathElement;
    fineOverlay: SVGPathElement;
    fineCenter: SVGCircleElement;
    fineHalo: SVGCircleElement;
    play: HTMLButtonElement;
    playUse: SVGUseElement;
    durationSeconds: number;
    positionSeconds: number;
    playing: boolean;
    playbackStartedAt: number;
    playbackBaseSeconds: number;
    playbackFrame: number | null;
    morphEpoch: number;
    sizeAnimation: Animation | null;
    opacityAnimation: Animation | null;
  };
  let expandedRecording: RecordingPlayerState | null = null;
  const parseRecordingDuration = (text: string): number => {
    const hours = Number(text.match(/(\d+)h/)?.[1] ?? 0);
    const minutes = Number(text.match(/(\d+)m/)?.[1] ?? 0);
    const seconds = Number(text.match(/(\d+)s/)?.[1] ?? 0);
    return Math.max(1, hours * 3600 + minutes * 60 + seconds);
  };
  const formatPlaybackTime = (seconds: number): string => {
    const whole = Math.max(0, Math.floor(seconds));
    const hours = Math.floor(whole / 3600);
    const minutes = Math.floor((whole % 3600) / 60);
    const secs = whole % 60;
    return hours > 0
      ? `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
      : `${minutes}:${String(secs).padStart(2, "0")}`;
  };
  function renderRecordingWaveMorph(
    state: RecordingPlayerState,
    morphProgress: number,
    phase: number,
  ): void {
    const progress = clamp01(morphProgress);
    state.player.style.setProperty("--recording-wave-morph", String(progress));
    if (progress <= 0) {
      state.waveEllipse.style.display = "";
      state.wavePath.style.display = "none";
      return;
    }
    state.waveEllipse.style.display = "none";
    state.wavePath.style.display = "";
    const width = 360;
    const height = 128;
    const center = height * 0.5;
    const morph = smoothStep(clamp01((progress - 0.08) / 0.92));
    const minimumAmplitude = height * 0.035 * morph;
    const maxAmplitude = height * (0.5 - 0.06 * morph);
    const pointCount = progress < 0.85 ? 128 : 256;
    const amplitudes = new Array<number>(pointCount);
    const top: string[] = [];
    const bottom: string[] = [];
    for (let point = 0; point < pointCount; point++) {
      const u = point / Math.max(1, pointCount - 1);
      const xNorm = (u - 0.5) * 2;
      const circle = Math.sqrt(Math.max(0, 1 - xNorm * xNorm));
      const organic = 1 + 0.018 * morph * Math.sin(u * 19 + phase * 0.7);
      const blobEnvelope = clamp01(circle * organic);
      const ribbonWobble = Math.max(
        0.08,
        Math.min(
          0.68,
          0.27 +
            0.07 * Math.sin(u * 31 + phase * 2.25) +
            0.04 * Math.sin(u * 67 - phase * 1.62) +
            0.022 * Math.sin(u * 113 + phase * 1.08),
        ),
      );
      const sample = blobEnvelope + (ribbonWobble - blobEnvelope) * morph;
      const amplitude = minimumAmplitude + maxAmplitude * clamp01(sample);
      amplitudes[point] = amplitude;
      const x = (width * point) / Math.max(1, pointCount - 1);
      top.push(
        `${point === 0 ? "M" : "L"}${x.toFixed(2)} ${(center - amplitude).toFixed(2)}`,
      );
    }
    for (let point = pointCount - 1; point >= 0; point--) {
      const x = (width * point) / Math.max(1, pointCount - 1);
      bottom.push(
        `L${x.toFixed(2)} ${(center + (amplitudes[point] ?? 0)).toFixed(2)}`,
      );
    }
    state.wavePath.setAttribute("d", `${top.join(" ")} ${bottom.join(" ")} Z`);
  }
  function renderRecordingFineField(state: RecordingPlayerState): void {
    const rect = state.fine.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    if (width <= 0 || height <= 0) return;
    const centerX = width * 0.5;
    const centerY = height * 0.5;
    const edgePadding = 10;
    const puckRadius = 24;
    const leftTipX = edgePadding;
    const rightTipX = width - edgePadding;
    const leftSpan = Math.max(1, centerX - puckRadius - leftTipX);
    const rightSpan = Math.max(1, rightTipX - (centerX + puckRadius));
    const topY = centerY - puckRadius;
    const bottomY = centerY + puckRadius;
    const path = [
      `M${leftTipX} ${centerY}`,
      `C${leftTipX + leftSpan * 0.3} ${centerY} ${Math.max(leftTipX, centerX - puckRadius - leftSpan * 0.28)} ${topY} ${centerX} ${topY}`,
      `C${Math.min(rightTipX, centerX + puckRadius + rightSpan * 0.28)} ${topY} ${rightTipX - rightSpan * 0.3} ${centerY} ${rightTipX} ${centerY}`,
      `C${rightTipX - rightSpan * 0.3} ${centerY} ${Math.min(rightTipX, centerX + puckRadius + rightSpan * 0.28)} ${bottomY} ${centerX} ${bottomY}`,
      `C${Math.max(leftTipX, centerX - puckRadius - leftSpan * 0.28)} ${bottomY} ${leftTipX + leftSpan * 0.3} ${centerY} ${leftTipX} ${centerY} Z`,
    ].join(" ");
    state.fineField.setAttribute("viewBox", `0 0 ${width} ${height}`);
    state.finePath.setAttribute("d", path);
    state.fineOverlay.setAttribute("d", path);
    state.fineCenter.setAttribute("cx", String(centerX));
    state.fineCenter.setAttribute("cy", String(centerY));
    state.fineCenter.setAttribute("r", "1.6");
    state.fineHalo.setAttribute("cx", String(centerX));
    state.fineHalo.setAttribute("cy", String(centerY));
    state.fineHalo.setAttribute("r", String(puckRadius * 1.28));
  }
  function syncRecordingPlayback(state: RecordingPlayerState): void {
    state.positionLabel.textContent = formatPlaybackTime(state.positionSeconds);
    state.durationLabel.textContent = formatPlaybackTime(state.durationSeconds);
    state.waveCursor.style.left =
      `${clamp01(state.positionSeconds / state.durationSeconds) * 100}%`;
    state.play.setAttribute("aria-label", state.playing ? "Pause" : "Play");
    state.playUse.setAttribute("href", state.playing ? "#i-pause" : "#i-play");
  }
  function stopRecordingPlaybackFrame(state: RecordingPlayerState): void {
    if (state.playbackFrame != null) cancelAnimationFrame(state.playbackFrame);
    state.playbackFrame = null;
  }
  function runRecordingPlayback(state: RecordingPlayerState): void {
    stopRecordingPlaybackFrame(state);
    if (!state.playing) return;
    state.playbackStartedAt = performance.now();
    state.playbackBaseSeconds = state.positionSeconds;
    const frame = (now: number) => {
      if (!state.playing || expandedRecording !== state) return;
      state.positionSeconds = Math.min(
        state.durationSeconds,
        state.playbackBaseSeconds + (now - state.playbackStartedAt) / 1000,
      );
      if (state.positionSeconds >= state.durationSeconds) state.playing = false;
      syncRecordingPlayback(state);
      if (state.playing) state.playbackFrame = requestAnimationFrame(frame);
      else state.playbackFrame = null;
    };
    state.playbackFrame = requestAnimationFrame(frame);
  }
  function setRecordingPlaying(state: RecordingPlayerState, playing: boolean): void {
    state.playing = playing;
    syncRecordingPlayback(state);
    if (playing) runRecordingPlayback(state);
    else stopRecordingPlaybackFrame(state);
  }
  function startRecordingWaveMorph(state: RecordingPlayerState): void {
    const epoch = ++state.morphEpoch;
    const startedAt = performance.now();
    renderRecordingWaveMorph(state, 0, startedAt / 1000);
    const frame = (now: number) => {
      if (state.morphEpoch !== epoch || expandedRecording !== state) return;
      const raw = clamp01((now - startedAt) / 760);
      renderRecordingWaveMorph(state, fastOutSlowIn(raw), now / 1000);
      if (raw < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }
  function cancelRecordingAnimations(state: RecordingPlayerState): void {
    state.sizeAnimation?.cancel();
    state.opacityAnimation?.cancel();
    state.sizeAnimation = null;
    state.opacityAnimation = null;
  }
  function collapseRecording(state: RecordingPlayerState): void {
    if (!state.card.classList.contains("expanded")) return;
    cancelRecordingAnimations(state);
    ++state.morphEpoch;
    setRecordingPlaying(state, false);
    state.card.classList.remove("expanded");
    state.summary.setAttribute("aria-expanded", "false");
    const fromHeight = state.expanded.getBoundingClientRect().height;
    const fromOpacity = Number(getComputedStyle(state.player).opacity);
    state.expanded.style.height = `${fromHeight}px`;
    state.opacityAnimation = state.player.animate(
      [{ opacity: fromOpacity }, { opacity: 0 }],
      { duration: 140, easing: "cubic-bezier(.4,0,.2,1)", fill: "forwards" },
    );
    state.sizeAnimation = state.expanded.animate(
      [{ height: `${fromHeight}px` }, { height: "0px" }],
      { duration: 260, easing: "cubic-bezier(.4,0,.2,1)", fill: "forwards" },
    );
    state.sizeAnimation.onfinish = () => {
      state.expanded.style.height = "0px";
      state.player.style.opacity = "0";
      state.expanded.setAttribute("aria-hidden", "true");
      state.expanded.inert = true;
      state.sizeAnimation?.cancel();
      state.opacityAnimation?.cancel();
      state.sizeAnimation = null;
      state.opacityAnimation = null;
    };
    if (expandedRecording === state) expandedRecording = null;
  }
  function expandRecording(state: RecordingPlayerState): void {
    if (expandedRecording === state) {
      collapseRecording(state);
      return;
    }
    if (expandedRecording) collapseRecording(expandedRecording);
    cancelRecordingAnimations(state);
    expandedRecording = state;
    state.card.classList.add("expanded");
    state.summary.setAttribute("aria-expanded", "true");
    state.expanded.inert = false;
    state.expanded.setAttribute("aria-hidden", "false");
    state.expanded.style.height = "auto";
    state.player.style.opacity = "1";
    const targetHeight = state.expanded.scrollHeight;
    state.expanded.style.height = "0px";
    state.player.style.opacity = "0";
    state.sizeAnimation = state.expanded.animate(
      [{ height: "0px" }, { height: `${targetHeight}px` }],
      { duration: 320, easing: "cubic-bezier(.4,0,.2,1)", fill: "forwards" },
    );
    state.opacityAnimation = state.player.animate(
      [{ opacity: 0 }, { opacity: 1 }],
      {
        duration: 220,
        delay: 70,
        easing: "cubic-bezier(.4,0,.2,1)",
        fill: "forwards",
      },
    );
    state.sizeAnimation.onfinish = () => {
      if (expandedRecording !== state) return;
      state.expanded.style.height = "auto";
      state.player.style.opacity = "1";
      state.sizeAnimation?.cancel();
      state.opacityAnimation?.cancel();
      state.sizeAnimation = null;
      state.opacityAnimation = null;
    };
    requestAnimationFrame(() => renderRecordingFineField(state));
    startRecordingWaveMorph(state);
    state.positionSeconds = 0;
    setRecordingPlaying(state, true);
  }
  document.querySelectorAll<HTMLElement>(".recording-card").forEach((card) => {
    const summary = card.querySelector<HTMLButtonElement>(".recording-summary");
    const expanded = card.querySelector<HTMLElement>(".recording-expanded");
    const player = card.querySelector<HTMLElement>(".recording-player");
    const waveEllipse = card.querySelector<SVGEllipseElement>(".recording-wave-ellipse");
    const wavePath = card.querySelector<SVGPathElement>(".recording-wave-shape");
    const waveCursor = card.querySelector<HTMLElement>(".recording-wave-cursor");
    const positionLabel = card.querySelector<HTMLElement>(".recording-player-times .position");
    const durationLabel = card.querySelector<HTMLElement>(".recording-player-times .duration");
    const fine = card.querySelector<HTMLElement>(".recording-fine");
    const fineField = card.querySelector<SVGSVGElement>(".recording-fine-field");
    const finePath = card.querySelector<SVGPathElement>(".recording-fine-path");
    const fineOverlay = card.querySelector<SVGPathElement>(".recording-fine-overlay");
    const fineCenter = card.querySelector<SVGCircleElement>(".recording-fine-center");
    const fineHalo = card.querySelector<SVGCircleElement>(".recording-fine-halo");
    const play = card.querySelector<HTMLButtonElement>(".recording-play");
    const playUse = play?.querySelector<SVGUseElement>("use");
    const subtitle = card.querySelector<HTMLElement>(".recording-subtitle");
    if (
      !summary || !expanded || !player || !waveEllipse || !wavePath ||
      !waveCursor || !positionLabel || !durationLabel || !fine || !fineField ||
      !finePath || !fineOverlay || !fineCenter || !fineHalo || !play || !playUse ||
      !subtitle
    )
      throw new Error("Reverb recording card is missing inline-player structure");
    const state: RecordingPlayerState = {
      card,
      summary,
      expanded,
      player,
      waveEllipse,
      wavePath,
      waveCursor,
      positionLabel,
      durationLabel,
      fine,
      fineField,
      finePath,
      fineOverlay,
      fineCenter,
      fineHalo,
      play,
      playUse,
      durationSeconds: parseRecordingDuration(subtitle.textContent ?? ""),
      positionSeconds: 0,
      playing: false,
      playbackStartedAt: 0,
      playbackBaseSeconds: 0,
      playbackFrame: null,
      morphEpoch: 0,
      sizeAnimation: null,
      opacityAnimation: null,
    };
    syncRecordingPlayback(state);
    summary.addEventListener("click", () => expandRecording(state));
    play.addEventListener("click", (event) => {
      event.stopPropagation();
      setRecordingPlaying(state, !state.playing);
    });
  });

  function makeRangeWavePath(): string {
    const width = 360;
    const center = 41;
    const samples = 181;
    let seed = 0x5eed1234;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 0xffffffff;
    };
    const top: string[] = [];
    const bottom: string[] = [];
    for (let index = 0; index < samples; index++) {
      const x = (index / (samples - 1)) * width;
      const phase = index / (samples - 1);
      const slow = 0.55 + 0.18 * Math.sin(phase * 21.4 + 0.7);
      const texture = 0.23 * Math.abs(Math.sin(phase * 83.1 + 1.3));
      const noise = 0.16 + random() * 0.34;
      let amplitude = 9 + 16 * Math.min(1, slow + texture + noise);
      if (index === 33 || index === 34 || index === 153) amplitude += 8;
      if (index === 118 || index === 160) amplitude += 5;
      amplitude = Math.min(34, amplitude);
      top.push(`${x.toFixed(1)} ${(center - amplitude * 0.52).toFixed(1)}`);
      bottom.push(`${x.toFixed(1)} ${(center + amplitude * 0.52).toFixed(1)}`);
    }
    return `M${top.join(" L")} L${bottom.reverse().join(" L")} Z`;
  }
  const rangeWavePath = makeRangeWavePath();
  document
    .querySelectorAll<SVGPathElement>(".wave-outside,.wave-selection")
    .forEach((path) => path.setAttribute("d", rangeWavePath));

  const rangeFineControl =
    document.querySelector<HTMLElement>(".range-screen .fine-control");
  if (!rangeFineControl)
    throw new Error("Reverb demo is missing range fine-seek control");
  const rangePlay = byId<HTMLButtonElement>("rangePlay");
  const rangeFineField = byId<SVGSVGElement>("rangeFineField");
  const rangeFineFieldPath = byId<SVGPathElement>("rangeFineFieldPath");
  const rangeFineFieldOverlay = byId<SVGPathElement>("rangeFineFieldOverlay");
  const rangeFineCenterDot = byId<SVGCircleElement>("rangeFineCenterDot");
  const rangeFineHalo = byId<SVGCircleElement>("rangeFineHalo");
  const rangeFineEdgeStart = byId<SVGStopElement>("rangeFineEdgeStart");
  const rangeFineCenterStop = byId<SVGStopElement>("rangeFineCenterStop");
  const rangeFineEdgeEnd = byId<SVGStopElement>("rangeFineEdgeEnd");
  let rangePlaying = false;
  let rangeFinePointerId = -1;
  let rangeFineStartedOnPuck = false;
  let rangeFineDownStartSeconds = 0;
  let rangeFineDownEndSeconds = 0;
  let rangeFineDownTarget: RangeEditTarget = "start";
  let rangeFineResumeAfterDrag = false;
  let rangeFineDragging = false;
  let rangeFineSuppressClick = false;
  let rangeFineDownX = 0;
  let rangeFineDownY = 0;
  let rangeFineRawVertical = 0;
  let rangeFineHorizontalPull = 0;
  let rangeFineDragStartRawVertical = 0;
  let rangeFineLastFrame = 0;
  let rangeFineSettleEpoch = 0;

  const clampUnit = (value: number) => Math.max(-1, Math.min(1, value));
  const rangeFineConstrainedY = (
    rawVerticalPull: number,
    horizontalPull: number,
  ) => {
    const x = Math.abs(clampUnit(horizontalPull));
    const edgeStiffness = Math.cosh(1.65 * x);
    const localRadius = 0.72 / Math.pow(edgeStiffness, 0.28);
    const inputScale =
      localRadius * 1.18 * Math.pow(edgeStiffness, 0.72);
    return localRadius * Math.tanh(rawVerticalPull / inputScale);
  };
  const rangeFineSpeedScale = (verticalPull: number) => {
    const y = clampUnit(verticalPull);
    return y <= 0
      ? 1 + 5 * Math.pow(-y, 1.45)
      : 0.018 + 0.982 * Math.pow(1 - y, 3.1);
  };
  const rangeFineTimelineRate = (
    horizontalVisualPull: number,
    verticalPull: number,
  ) => {
    const pull = clampUnit(horizontalVisualPull / 0.62);
    const magnitude = Math.abs(pull);
    if (magnitude <= 0.002) return 0;
    const normalized = Math.max(
      0,
      Math.min(1, (magnitude - 0.002) / 0.998),
    );
    const horizontalRate =
      0.00002 +
      0.0004 * normalized +
      0.004 * Math.pow(normalized, 3) +
      0.055 * Math.pow(normalized, 7);
    return (
      Math.sign(pull) *
      horizontalRate *
      rangeFineSpeedScale(verticalPull)
    );
  };
  const rangeFineTravel = () => {
    const rect = rangeFineControl.getBoundingClientRect();
    return {
      rect,
      horizontal: Math.max(1, rect.width * 0.5 - 10 - 24),
      vertical: Math.max(1, rect.height * 0.5 - 10 - 24),
    };
  };
  const renderRangeFineVisual = () => {
    const travel = rangeFineTravel();
    const width = travel.rect.width;
    const height = travel.rect.height;
    const centerX = width * 0.5;
    const centerY = height * 0.5;
    const edgePadding = 10;
    const puckRadius = 24;
    const constrainedY = rangeFineConstrainedY(
      rangeFineRawVertical,
      rangeFineHorizontalPull,
    );
    const puckX = centerX + rangeFineHorizontalPull * travel.horizontal;
    const puckY = centerY + constrainedY * travel.vertical;
    const leftTipX = edgePadding;
    const rightTipX = width - edgePadding;
    const leftSpan = Math.max(1, puckX - puckRadius - leftTipX);
    const rightSpan = Math.max(1, rightTipX - (puckX + puckRadius));
    const topY = puckY - puckRadius;
    const bottomY = puckY + puckRadius;
    const path = [
      `M${leftTipX} ${centerY}`,
      `C${leftTipX + leftSpan * 0.3} ${centerY} ${Math.max(leftTipX, puckX - puckRadius - leftSpan * 0.28)} ${topY} ${puckX} ${topY}`,
      `C${Math.min(rightTipX, puckX + puckRadius + rightSpan * 0.28)} ${topY} ${rightTipX - rightSpan * 0.3} ${centerY} ${rightTipX} ${centerY}`,
      `C${rightTipX - rightSpan * 0.3} ${centerY} ${Math.min(rightTipX, puckX + puckRadius + rightSpan * 0.28)} ${bottomY} ${puckX} ${bottomY}`,
      `C${Math.max(leftTipX, puckX - puckRadius - leftSpan * 0.28)} ${bottomY} ${leftTipX + leftSpan * 0.3} ${centerY} ${leftTipX} ${centerY} Z`,
    ].join(" ");
    rangeFineField.setAttribute("viewBox", `0 0 ${Math.max(1, width)} ${Math.max(1, height)}`);
    rangeFineFieldPath.setAttribute("d", path);
    rangeFineFieldOverlay.setAttribute("d", path);
    const horizontalPower = Math.pow(Math.abs(rangeFineHorizontalPull), 0.72);
    const yMagnitude = clamp01(Math.abs(constrainedY) / 0.72);
    const otherColor = constrainedY < 0 ? "var(--tertiary)" : "var(--secondary)";
    const mix = (yMagnitude * 100).toFixed(3);
    const base = (100 - yMagnitude * 100).toFixed(3);
    rangeFineControl.style.setProperty(
      "--fine-field-color",
      yMagnitude <= 0.0001
        ? "var(--primary)"
        : `color-mix(in srgb,var(--primary) ${base}%,${otherColor} ${mix}%)`,
    );
    const fieldAlpha = 0.12 + 0.13 * horizontalPower + 0.06 * yMagnitude;
    for (const edge of [rangeFineEdgeStart, rangeFineEdgeEnd]) {
      edge.setAttribute("stop-color", "var(--fine-field-color)");
      edge.setAttribute("stop-opacity", "0.018");
    }
    rangeFineCenterStop.setAttribute("stop-color", "var(--fine-field-color)");
    rangeFineCenterStop.setAttribute("stop-opacity", String(fieldAlpha));
    rangeFineFieldOverlay.setAttribute("fill-opacity", String(0.035 + 0.045 * yMagnitude));
    rangeFineCenterDot.setAttribute("cx", String(centerX));
    rangeFineCenterDot.setAttribute("cy", String(centerY));
    rangeFineCenterDot.setAttribute("r", "1.6");
    rangeFineCenterDot.setAttribute("fill-opacity", rangeFineDragging ? "0.20" : "0.13");
    rangeFineHalo.setAttribute("cx", String(puckX));
    rangeFineHalo.setAttribute("cy", String(puckY));
    rangeFineHalo.setAttribute("r", String(puckRadius * 1.28));
    rangeFineHalo.setAttribute(
      "fill-opacity",
      rangeFineDragging ? String(0.055 + 0.055 * horizontalPower) : "0",
    );
    rangePlay.style.transform =
      `translate(${(rangeFineHorizontalPull * travel.horizontal).toFixed(2)}px, ${(constrainedY * travel.vertical).toFixed(2)}px)`;
    rangeFineControl.style.setProperty(
      "--range-fine-horizontal-pull",
      String(rangeFineHorizontalPull),
    );
    rangeFineControl.style.setProperty(
      "--range-fine-raw-vertical-pull",
      String(rangeFineRawVertical),
    );
  };
  const updateRangeFinePull = (clientX: number, clientY: number) => {
    const travel = rangeFineTravel();
    const centerX = travel.rect.left + travel.rect.width * 0.5;
    rangeFineHorizontalPull = clampUnit(
      (clientX - centerX) / travel.horizontal,
    );
    const verticalInputTravel = travel.vertical * 2.35;
    rangeFineRawVertical =
      rangeFineDragStartRawVertical +
      (clientY - rangeFineDownY) / Math.max(1, verticalInputTravel);
    renderRangeFineVisual();
  };
  const settleRangeFinePull = () => {
    const startX = rangeFineHorizontalPull;
    const startY = rangeFineRawVertical;
    if (Math.abs(startX) < 0.0001 && Math.abs(startY) < 0.0001) {
      rangeFineHorizontalPull = 0;
      rangeFineRawVertical = 0;
      renderRangeFineVisual();
      return;
    }
    const epoch = ++rangeFineSettleEpoch;
    let startedAt: number | null = null;
    const duration = 210;
    const strength = 3.4;
    const denominator = Math.cosh(strength) - 1;
    const frame = (now: number) => {
      if (epoch !== rangeFineSettleEpoch || rangeFineDragging) return;
      if (startedAt == null) {
        startedAt = now;
        requestAnimationFrame(frame);
        return;
      }
      const t = clamp01((now - startedAt) / duration);
      const remaining =
        (Math.cosh(strength * (1 - t)) - 1) / denominator;
      rangeFineHorizontalPull = startX * remaining;
      rangeFineRawVertical = startY * remaining;
      renderRangeFineVisual();
      if (t < 1) requestAnimationFrame(frame);
      else {
        rangeFineHorizontalPull = 0;
        rangeFineRawVertical = 0;
        renderRangeFineVisual();
      }
    };
    requestAnimationFrame(frame);
  };
  const rangeFineFrame = (time: number) => {
    if (!rangeFineDragging) return;
    if (rangeFineLastFrame > 0) {
      const dt = Math.min(0.05, Math.max(0, (time - rangeFineLastFrame) / 1000));
      const constrainedY = rangeFineConstrainedY(
        rangeFineRawVertical,
        rangeFineHorizontalPull,
      );
      const deltaSeconds =
        rangeFineTimelineRate(rangeFineHorizontalPull, constrainedY) *
        Math.max(0, rangeTimelineDurationSeconds) *
        dt;
      if (deltaSeconds !== 0) {
        const current =
          rangeEditTarget === "start" ? rangeStartSeconds : rangeEndSeconds;
        adjustRangeTarget(rangeEditTarget, current + deltaSeconds);
      }
    }
    rangeFineLastFrame = time;
    requestAnimationFrame(rangeFineFrame);
  };
  const startRangeFineAdjust = (clientX: number, clientY: number) => {
    if (rangeFineDragging) return;
    ++rangeFineSettleEpoch;
    rangeFineDragStartRawVertical = rangeFineRawVertical;
    // Native drag invalidates the active text draft instead of committing it on focus loss.
    rangeStartSeconds = rangeFineDownStartSeconds;
    rangeEndSeconds = rangeFineDownEndSeconds;
    rangeEditTarget = rangeFineDownTarget;
    renderRangeUi();
    rangeStartInput.blur();
    rangeEndInput.blur();
    rangeFineResumeAfterDrag = rangePlaying;
    if (rangePlaying) setRangePlaying(false);
    rangeFineDragging = true;
    rangeFineLastFrame = 0;
    rangeFineControl.classList.add("is-dragging");
    renderRangeFineVisual();
    if (
      rangeFinePointerId !== -1 &&
      !rangeFineControl.hasPointerCapture?.(rangeFinePointerId)
    ) {
      try {
        rangeFineControl.setPointerCapture?.(rangeFinePointerId);
      } catch {
        // Synthetic PointerEvents have no browser-owned pointer to capture.
      }
    }
    updateRangeFinePull(clientX, clientY);
    requestAnimationFrame(rangeFineFrame);
  };
  const finishRangeFineAdjust = (
    cancelled = false,
    resumePreview = true,
  ) => {
    if (rangeFinePointerId === -1 && !rangeFineDragging) return;
    const pointerId = rangeFinePointerId;
    if (!rangeFineDragging) {
      rangeFinePointerId = -1;
      rangeFineStartedOnPuck = false;
      rangeFineResumeAfterDrag = false;
      return;
    }
    const shouldResumePreview = resumePreview && rangeFineResumeAfterDrag;
    rangeFineResumeAfterDrag = false;
    if (rangeFineDragging && rangeFineStartedOnPuck && !cancelled) {
      rangeFineSuppressClick = true;
      setTimeout(() => {
        rangeFineSuppressClick = false;
      }, 0);
    }
    rangeFineDragging = false;
    rangeFinePointerId = -1;
    rangeFineLastFrame = 0;
    rangeFineControl.classList.remove("is-dragging");
    renderRangeFineVisual();
    settleRangeFinePull();
    if (
      pointerId !== -1 &&
      rangeFineControl.hasPointerCapture?.(pointerId)
    ) {
      rangeFineControl.releasePointerCapture(pointerId);
    }
    if (shouldResumePreview) setRangePlaying(true);
  };
  rangeFineControl.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (rangeFinePointerId !== -1) return;
    if (rangeWheelInteractionActive()) return;
    rangeFinePointerId = event.pointerId;
    rangeFineDownX = event.clientX;
    rangeFineDownY = event.clientY;
    rangeFineDownStartSeconds = rangeStartSeconds;
    rangeFineDownEndSeconds = rangeEndSeconds;
    rangeFineDownTarget = rangeEditTarget;
    rangeFineStartedOnPuck = event.composedPath().includes(rangePlay);
    if (!rangeFineStartedOnPuck)
      startRangeFineAdjust(event.clientX, event.clientY);
  });
  rangeFineControl.addEventListener("pointermove", (event) => {
    if (event.pointerId !== rangeFinePointerId) return;
    if (!rangeFineDragging) {
      const dx = event.clientX - rangeFineDownX;
      const dy = event.clientY - rangeFineDownY;
      if (dx * dx + dy * dy <= 64) return;
      startRangeFineAdjust(event.clientX, event.clientY);
    } else {
      updateRangeFinePull(event.clientX, event.clientY);
    }
    event.preventDefault();
  });
  const endRangeFinePointer = (event: PointerEvent) => {
    if (event.pointerId !== rangeFinePointerId) return;
    finishRangeFineAdjust(event.type === "pointercancel");
  };
  rangeFineControl.addEventListener("pointerup", endRangeFinePointer);
  rangeFineControl.addEventListener("pointercancel", endRangeFinePointer);
  rangeFineControl.addEventListener("lostpointercapture", () => {
    if (rangeFinePointerId !== -1) finishRangeFineAdjust(true);
  });

  renderRangeFineVisual();

  function setRangePlaying(playing: boolean): void {
    rangePlaying = playing;
    const use = rangePlay.querySelector("use");
    use?.setAttribute("href", rangePlaying ? "#i-pause" : "#i-play");
    rangePlay.setAttribute("aria-label", rangePlaying ? "Pause" : "Play");
  }
  function endRangeTransientOwnership(): void {
    cancelRangeWheelInteraction();
    cancelRangeWaveScrub(false);
    finishRangeFineAdjust(true, false);
    setRangePlaying(false);
  }
  rangePlay.addEventListener("click", (event) => {
    if (rangeFineSuppressClick) {
      event.preventDefault();
      return;
    }
    const activeDraft =
      rangeStartInput.matches(":focus")
        ? ([rangeStartInput, "start"] as const)
        : rangeEndInput.matches(":focus")
          ? ([rangeEndInput, "end"] as const)
          : null;
    if (activeDraft && !commitRangeInput(activeDraft[0], activeDraft[1])) {
      rangePlay.focus({ preventScroll: true });
      return;
    }
    if (
      rangeStartInput.getAttribute("aria-invalid") === "true" ||
      rangeEndInput.getAttribute("aria-invalid") === "true"
    ) {
      rangePlay.focus({ preventScroll: true });
      return;
    }
    setRangePlaying(!rangePlaying);
  });
  document.addEventListener("keydown", (event) => {
    if (
      !(event instanceof KeyboardEvent) ||
      event.key !== "Escape" ||
      event.defaultPrevented ||
      currentScreen !== "rangeScreen"
    ) return;
    event.preventDefault();
    event.stopPropagation();
    endRangeTransientOwnership();
    renderRangeUi();
    cancelRangeOpeningMotion();
    showScreen("homeScreen", byId<HTMLElement>("openRange"));
  });

  const wakeSwitch = byId<HTMLElement>("wakeSwitch");
  const themeSegments = [
    ...document.querySelectorAll<HTMLButtonElement>("#themeSegments .segment"),
  ];
  const retentionSegments = [
    ...document.querySelectorAll<HTMLButtonElement>("#retentionSegments .segment"),
  ];
  const themeGroup = byId<HTMLElement>("themeSegments");
  const retentionGroup = byId<HTMLElement>("retentionSegments");
  themeGroup.setAttribute("role", "radiogroup");
  themeGroup.setAttribute("aria-label", "Theme");
  retentionGroup.setAttribute("role", "radiogroup");
  retentionGroup.setAttribute("aria-label", "Retention");
  const syncRadioSegments = (
    segments: HTMLButtonElement[],
    selected: (segment: HTMLButtonElement) => boolean,
  ) => {
    segments.forEach((segment) => {
      const checked = selected(segment);
      segment.setAttribute("role", "radio");
      segment.setAttribute("aria-checked", String(checked));
      segment.tabIndex = checked ? 0 : -1;
      segment.classList.toggle("selected", checked);
    });
  };
  const oneRetention = byId<HTMLInputElement>("oneRetention");
  const loopRetention = byId<HTMLInputElement>("loopRetention");
  const oneRetentionUnit = byId<HTMLElement>("oneRetentionUnit");
  const loopRetentionUnit = byId<HTMLElement>("loopRetentionUnit");
  const retentionError = byId<HTMLElement>("retentionError");
  const dropdownValues = () => [
    ...document.querySelectorAll<HTMLElement>(".settings-card.dropdown .value"),
  ];
  function selectedTheme(): string {
    return (
      themeSegments.find((segment) => segment.classList.contains("selected"))
        ?.dataset.theme ?? "Auto"
    );
  }
  function captureSettingsSnapshot(): SettingsSnapshot {
    return {
      theme: selectedTheme(),
      retentionMode,
      oneTimeSeconds: oneRetentionTimeSeconds,
      oneSizeMiB: oneRetentionSizeMiB,
      loopTimeSeconds: loopRetentionTimeSeconds,
      loopSizeMiB: loopRetentionSizeMiB,
      dropdowns: dropdownValues().map((value) => value.textContent ?? ""),
      wake: wakeSwitch.classList.contains("on"),
    };
  }
  const formatRetentionTimeInput = (seconds: number) => {
    const value = Math.max(0, Math.floor(seconds));
    const hours = Math.floor(value / 3600);
    const minutes = Math.floor((value % 3600) / 60);
    const secs = value % 60;
    return hours + ":" + String(minutes).padStart(2, "0") + ":" +
      String(secs).padStart(2, "0");
  };
  const formatRetentionSizeInput = (sizeMiB: number) => String(sizeMiB);
  const resetRetentionDrafts = (snapshot: SettingsSnapshot) => {
    settingsOneTimeSeconds = snapshot.oneTimeSeconds;
    settingsLoopTimeSeconds = snapshot.loopTimeSeconds;
    settingsOneSizeMiB = snapshot.oneSizeMiB;
    settingsLoopSizeMiB = snapshot.loopSizeMiB;
    settingsOneTimeText = formatRetentionTimeInput(settingsOneTimeSeconds);
    settingsLoopTimeText = formatRetentionTimeInput(settingsLoopTimeSeconds);
    settingsOneSizeText = formatRetentionSizeInput(settingsOneSizeMiB);
    settingsLoopSizeText = formatRetentionSizeInput(settingsLoopSizeMiB);
  };
  settingsInitial = captureSettingsSnapshot();
  resetRetentionDrafts(settingsInitial);
  const settingsDone = byId<HTMLButtonElement>("settingsDone");
  function setDirty(dirty: boolean): void {
    settingsDirty = dirty;
    settingsDone.disabled = !dirty;
    settingsDone.classList.toggle("disabled", !dirty);
    byId("settingsNavBack").style.display = dirty ? "none" : "block";
    byId("settingsNavUndo").style.display = dirty ? "block" : "none";
    byId("settingsNav").setAttribute("aria-label", dirty ? "Undo" : "Back");
  }
  setDirty(false);
  const activeRetentionInvalid = () =>
    retentionMode === "time"
      ? parseRetentionTime(settingsOneTimeText) == null ||
        parseRetentionTime(settingsLoopTimeText) == null
      : parseRetentionSize(settingsOneSizeText) == null ||
        parseRetentionSize(settingsLoopSizeText) == null;
  const settingsMatchSnapshot = () => {
    if (
      selectedTheme() !== settingsInitial.theme ||
      retentionMode !== settingsInitial.retentionMode ||
      settingsOneTimeSeconds !== settingsInitial.oneTimeSeconds ||
      settingsLoopTimeSeconds !== settingsInitial.loopTimeSeconds ||
      settingsOneSizeMiB !== settingsInitial.oneSizeMiB ||
      settingsLoopSizeMiB !== settingsInitial.loopSizeMiB ||
      wakeSwitch.classList.contains("on") !== settingsInitial.wake
    )
      return false;
    const dropdowns = dropdownValues();
    return dropdowns.every(
      (value, index) =>
        (value.textContent ?? "") === (settingsInitial.dropdowns[index] ?? ""),
    );
  };
  const recomputeDirty = () =>
    setDirty(!settingsMatchSnapshot() || activeRetentionInvalid());
  type RetentionErrorState = {
    message: string;
    oneInvalid: boolean;
    loopInvalid: boolean;
  };
  let retentionTimeError: RetentionErrorState | null = null;
  let retentionSizeError: RetentionErrorState | null = null;
  const renderRetentionError = () => {
    retentionError.hidden = true;
    retentionError.textContent = "";
    oneRetention.removeAttribute("aria-invalid");
    loopRetention.removeAttribute("aria-invalid");
    oneRetention.removeAttribute("aria-describedby");
    loopRetention.removeAttribute("aria-describedby");
    const error =
      retentionMode === "time" ? retentionTimeError : retentionSizeError;
    if (!error) return;
    retentionError.textContent = error.message;
    retentionError.hidden = false;
    if (error.oneInvalid) {
      oneRetention.setAttribute("aria-invalid", "true");
      oneRetention.setAttribute("aria-describedby", "retentionError");
    }
    if (error.loopInvalid) {
      loopRetention.setAttribute("aria-invalid", "true");
      loopRetention.setAttribute("aria-describedby", "retentionError");
    }
  };
  const clearRetentionErrors = () => {
    retentionTimeError = null;
    retentionSizeError = null;
    renderRetentionError();
  };
  const clearActiveRetentionError = (slot?: BufferSlot) => {
    const current =
      retentionMode === "time" ? retentionTimeError : retentionSizeError;
    if (!current) return;
    const next = { ...current };
    if (slot == null || slot === "one") next.oneInvalid = false;
    if (slot == null || slot === "loop") next.loopInvalid = false;
    const value = next.oneInvalid || next.loopInvalid ? next : null;
    if (retentionMode === "time") retentionTimeError = value;
    else retentionSizeError = value;
    renderRetentionError();
  };
  const showRetentionError = (
    message: string,
    oneInvalid = true,
    loopInvalid = true,
  ) => {
    const value = { message, oneInvalid, loopInvalid };
    if (retentionMode === "time") retentionTimeError = value;
    else retentionSizeError = value;
    renderRetentionError();
  };
  function setTheme(theme: string, dirty = true): void {
    if (dirty && selectedTheme() === theme) return;
    syncRadioSegments(
      themeSegments,
      (segment) => segment.dataset.theme === theme,
    );
    if (dirty) recomputeDirty();
  }
  const formatRetentionMinutesEstimate = (seconds: number) => {
    const wholeSeconds = Math.max(0, Math.floor(seconds));
    if (wholeSeconds <= 0) return "0";
    return wholeSeconds % 60 === 0
      ? String(wholeSeconds / 60)
      : (wholeSeconds / 60).toFixed(1);
  };
  const renderRetentionEstimates = () => {
    if (retentionMode === "time") {
      byId("oneEstimate").textContent =
        "≈ " +
        Math.round((settingsOneTimeSeconds * bytesPerSecond) / (1024 * 1024)) +
        " MiB";
      byId("loopEstimate").textContent =
        "≈ " +
        Math.round((settingsLoopTimeSeconds * bytesPerSecond) / (1024 * 1024)) +
        " MiB";
    } else {
      const oneSeconds =
        (settingsOneSizeMiB * 1024 * 1024) / bytesPerSecond;
      const loopSeconds =
        (settingsLoopSizeMiB * 1024 * 1024) / bytesPerSecond;
      byId("oneEstimate").textContent =
        "≈ " + formatRetentionMinutesEstimate(oneSeconds) + " min";
      byId("loopEstimate").textContent =
        "≈ " + formatRetentionMinutesEstimate(loopSeconds) + " min";
    }
  };
  const renderRetentionInputs = () => {
    const sizeMode = retentionMode === "size";
    oneRetentionUnit.hidden = !sizeMode;
    loopRetentionUnit.hidden = !sizeMode;
    if (retentionMode === "time") {
      oneRetention.value = settingsOneTimeText;
      loopRetention.value = settingsLoopTimeText;
    } else {
      oneRetention.value = settingsOneSizeText;
      loopRetention.value = settingsLoopSizeText;
    }
    renderRetentionEstimates();
  };
  function setRetentionMode(mode: RetentionMode, dirty = true): void {
    if (dirty && retentionMode === mode) return;
    retentionMode = mode;
    syncRadioSegments(
      retentionSegments,
      (segment) => segment.dataset.retentionMode === mode,
    );
    renderRetentionError();
    renderRetentionInputs();
    if (dirty) recomputeDirty();
  }
  setTheme(selectedTheme(), false);
  setRetentionMode(retentionMode, false);
  const updateRetentionDraft = (slot: BufferSlot, value: string) => {
    clearActiveRetentionError(slot);
    if (retentionMode === "time") {
      const parsed = parseRetentionTime(value);
      if (slot === "one") {
        settingsOneTimeText = value;
        if (parsed != null) settingsOneTimeSeconds = parsed;
      } else {
        settingsLoopTimeText = value;
        if (parsed != null) settingsLoopTimeSeconds = parsed;
      }
    } else {
      const parsed = parseRetentionSize(value);
      if (slot === "one") {
        settingsOneSizeText = value;
        if (parsed != null) settingsOneSizeMiB = parsed;
      } else {
        settingsLoopSizeText = value;
        if (parsed != null) settingsLoopSizeMiB = parsed;
      }
    }
    renderRetentionEstimates();
    recomputeDirty();
  };
  const installRadioGroupKeys = (
    segments: HTMLButtonElement[],
    select: (segment: HTMLButtonElement) => void,
  ) => {
    segments.forEach((segment) => {
      segment.addEventListener("keydown", (event) => {
        const index = segments.indexOf(segment);
        let target: HTMLButtonElement | undefined;
        if (event.key === "ArrowRight" || event.key === "ArrowDown")
          target = segments[(index + 1) % segments.length];
        else if (event.key === "ArrowLeft" || event.key === "ArrowUp")
          target = segments[(index - 1 + segments.length) % segments.length];
        else if (event.key === "Home") target = segments[0];
        else if (event.key === "End") target = segments[segments.length - 1];
        else return;
        event.preventDefault();
        if (!target) return;
        select(target);
        target.focus({ preventScroll: true });
      });
    });
  };
  themeSegments.forEach((segment) =>
    segment.addEventListener("click", () =>
      setTheme(segment.dataset.theme ?? "Auto"),
    ),
  );
  const selectRetentionMode = (segment: HTMLButtonElement) => {
    const mode =
      segment.dataset.retentionMode === "size" ? "size" : "time";
    if (mode === retentionMode) return;
    setRetentionMode(mode);
  };
  retentionSegments.forEach((segment) =>
    segment.addEventListener("click", () => selectRetentionMode(segment)),
  );
  installRadioGroupKeys(themeSegments, (segment) =>
    setTheme(segment.dataset.theme ?? "Auto"),
  );
  installRadioGroupKeys(retentionSegments, selectRetentionMode);
  oneRetention.addEventListener("input", () =>
    updateRetentionDraft("one", oneRetention.value),
  );
  loopRetention.addEventListener("input", () =>
    updateRetentionDraft("loop", loopRetention.value),
  );
  wakeSwitch.addEventListener("click", () => {
    const on = !wakeSwitch.classList.contains("on");
    wakeSwitch.classList.toggle("on", on);
    wakeSwitch.setAttribute("aria-checked", String(on));
    recomputeDirty();
  });
  function restoreSettings(): void {
    clearRetentionErrors();
    setTheme(settingsInitial.theme, false);
    dropdownValues().forEach((value, index) => {
      value.textContent = settingsInitial.dropdowns[index] ?? "";
    });
    wakeSwitch.classList.toggle("on", settingsInitial.wake);
    wakeSwitch.setAttribute("aria-checked", String(settingsInitial.wake));
    resetRetentionDrafts(settingsInitial);
    retentionMode = settingsInitial.retentionMode;
    setRetentionMode(retentionMode, false);
    setDirty(false);
  }
  function prepareSettingsSession(): void {
    if (settingsDirty) return;
    clearRetentionErrors();
    resetRetentionDrafts(settingsInitial);
    retentionMode = settingsInitial.retentionMode;
    setRetentionMode(retentionMode, false);
  }
  const validateRetentionDrafts = () => {
    clearRetentionErrors();
    if (retentionMode === "time") {
      const one = parseRetentionTime(settingsOneTimeText);
      const loop = parseRetentionTime(settingsLoopTimeText);
      if (one == null) {
        showRetentionError("Use H:MM:SS.", true, false);
        return false;
      }
      if (loop == null) {
        showRetentionError("Use H:MM:SS.", false, true);
        return false;
      }
      settingsOneTimeSeconds = one;
      settingsLoopTimeSeconds = loop;
      if (one <= 0 && loop <= 0) {
        showRetentionError("Keep at least one buffer on.");
        return false;
      }
    } else {
      const one = parseRetentionSize(settingsOneSizeText);
      const loop = parseRetentionSize(settingsLoopSizeText);
      if (one == null) {
        showRetentionError("Enter a valid number.", true, false);
        return false;
      }
      if (loop == null) {
        showRetentionError("Enter a valid number.", false, true);
        return false;
      }
      settingsOneSizeMiB = one;
      settingsLoopSizeMiB = loop;
      if (one <= 0 && loop <= 0) {
        showRetentionError("Keep at least one buffer on.");
        return false;
      }
    }
    return true;
  };
  byId("settingsNav").addEventListener("click", () => {
    if (settingsDirty) restoreSettings();
    else closeSettingsPanel();
  });
  byId("settingsDone").addEventListener("click", () => {
    if (!settingsDirty) return;
    if (!validateRetentionDrafts()) {
      recomputeDirty();
      return;
    }
    oneRetentionTimeSeconds = settingsOneTimeSeconds;
    loopRetentionTimeSeconds = settingsLoopTimeSeconds;
    oneRetentionSizeMiB = settingsOneSizeMiB;
    loopRetentionSizeMiB = settingsLoopSizeMiB;
    oneLimitSeconds =
      retentionMode === "time"
        ? oneRetentionTimeSeconds
        : (oneRetentionSizeMiB * 1024 * 1024) / bytesPerSecond;
    loopLimitSeconds =
      retentionMode === "time"
        ? loopRetentionTimeSeconds
        : (loopRetentionSizeMiB * 1024 * 1024) / bytesPerSecond;
    oneSeconds = Math.min(oneSeconds, oneLimitSeconds);
    loopSeconds = Math.min(loopSeconds, loopLimitSeconds);
    syncBufferUi();
    settingsInitial = captureSettingsSnapshot();
    clearRetentionErrors();
    setDirty(false);
    if (settingsReturnScreen === "rangeScreen") renderRangeUi();
    closeSettingsPanel();
  });

  let activeDropdown: HTMLElement | null = null;
  dropdownMenu.setAttribute("role", "menu");
  dropdownMenu.setAttribute("aria-hidden", "true");
  function closeDropdown(restoreFocus = false): void {
    const trigger = activeDropdown;
    trigger?.setAttribute("aria-expanded", "false");
    dropdownMenu.classList.remove("show");
    dropdownMenu.setAttribute("aria-hidden", "true");
    dropdownMenu.removeAttribute("aria-label");
    dropdownMenu.replaceChildren();
    activeDropdown = null;
    if (restoreFocus && trigger)
      requestAnimationFrame(() =>
        trigger.isConnected && trigger.focus({ preventScroll: true }),
      );
  }
  document
    .querySelector<HTMLElement>(".settings-body")
    ?.addEventListener("scroll", () => closeDropdown(true), { passive: true });
  const removeResizeListener = addWindowEventListener(
    "resize",
    () => closeDropdown(true),
    { passive: true },
  );
  document.addEventListener(
    "pointerdown",
    (event) => {
      if (
        activeDropdown &&
        event.target instanceof Node &&
        !dropdownMenu.contains(event.target) &&
        !activeDropdown.contains(event.target)
      )
        closeDropdown();
    },
    true,
  );
  document
    .querySelectorAll<HTMLElement>(".settings-card.dropdown")
    .forEach((field) => {
      field.setAttribute("aria-haspopup", "menu");
      field.setAttribute("aria-controls", "dropdownMenu");
      field.setAttribute("aria-expanded", "false");
      field.addEventListener("click", (event) => {
        event.stopPropagation();
        if (activeDropdown === field && dropdownMenu.classList.contains("show")) {
          closeDropdown(true);
          return;
        }
        closeDropdown();
        activeDropdown = field;
        field.setAttribute("aria-expanded", "true");
        const options = (field.dataset.options ?? "")
          .split("|")
          .filter(Boolean);
        const value = field.querySelector<HTMLElement>(".value");
        if (!value) return;
        let selectedButton: HTMLButtonElement | null = null;
        options.forEach((option) => {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "dropdown-item";
          button.textContent = option;
          button.setAttribute("role", "menuitemradio");
          const selected = option === value.textContent;
          button.setAttribute("aria-checked", String(selected));
          if (selected) selectedButton = button;
          button.addEventListener("click", () => {
            value.textContent = option;
            recomputeDirty();
            closeDropdown(true);
          });
          dropdownMenu.appendChild(button);
        });
        const caption =
          field.querySelector<HTMLElement>(".caption")?.textContent?.trim();
        if (caption) dropdownMenu.setAttribute("aria-label", caption + " options");
        const rect = field.getBoundingClientRect(),
          root = phone.getBoundingClientRect();
        dropdownMenu.classList.add("show");
        const scaleX = root.width > 0 ? root.width / phone.clientWidth : 1;
        const scaleY = root.height > 0 ? root.height / phone.clientHeight : 1;
        const localLeft = (rect.left - root.left) / scaleX;
        const localTop = (rect.top - root.top) / scaleY;
        const localBottom = (rect.bottom - root.top) / scaleY;
        const menuWidth = Math.min(
          phone.clientWidth - 16,
          Math.max(160, rect.width / scaleX),
        );
        const menuHeight = Math.min(300, dropdownMenu.scrollHeight);
        const below = phone.clientHeight - 8 - (localBottom + 4);
        const above = localTop - 4 - 8;
        const preferredTop = below >= menuHeight || below >= above
          ? localBottom + 4
          : localTop - menuHeight - 4;
        const maxTop = Math.max(8, phone.clientHeight - menuHeight - 8);
        const maxLeft = Math.max(8, phone.clientWidth - menuWidth - 8);
        dropdownMenu.style.left = `${Math.min(maxLeft, Math.max(8, localLeft))}px`;
        dropdownMenu.style.top = `${Math.min(maxTop, Math.max(8, preferredTop))}px`;
        dropdownMenu.style.width = `${menuWidth}px`;
        dropdownMenu.setAttribute("aria-hidden", "false");
        const initialFocus =
          selectedButton ??
          dropdownMenu.querySelector<HTMLButtonElement>(".dropdown-item");
        if (initialFocus)
          requestAnimationFrame(() =>
            initialFocus.isConnected &&
            initialFocus.focus({ preventScroll: true }),
          );
      });
    });
  dropdownMenu.addEventListener("keydown", (event) => {
    if (!(event instanceof KeyboardEvent) || !activeDropdown) return;
    const items = [
      ...dropdownMenu.querySelectorAll<HTMLButtonElement>(
        ".dropdown-item:not(:disabled)",
      ),
    ];
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      closeDropdown(true);
      return;
    }
    if (event.key === "Tab") {
      const trigger = activeDropdown;
      const focusable = [
        ...byId<HTMLElement>("settingsScreen").querySelectorAll<HTMLElement>(
          'a[href],button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])',
        ),
      ].filter(
        (element) =>
          element.tabIndex >= 0 &&
          element.getClientRects().length > 0 &&
          !dropdownMenu.contains(element),
      );
      const index = focusable.indexOf(trigger);
      const next = event.shiftKey
        ? index <= 0
          ? focusable[focusable.length - 1]
          : focusable[index - 1]
        : index < 0 || index === focusable.length - 1
          ? focusable[0]
          : focusable[index + 1];
      event.preventDefault();
      closeDropdown();
      next?.focus({ preventScroll: true });
      return;
    }
    if (!items.length) return;
    const current =
      event.target instanceof HTMLButtonElement ? event.target : null;
    const index = current ? items.indexOf(current) : -1;
    let next: HTMLButtonElement | undefined;
    if (event.key === "ArrowDown")
      next = items[index < 0 || index === items.length - 1 ? 0 : index + 1];
    else if (event.key === "ArrowUp")
      next = items[index <= 0 ? items.length - 1 : index - 1];
    else if (event.key === "Home") next = items[0];
    else if (event.key === "End") next = items[items.length - 1];
    else return;
    event.preventDefault();
    next?.focus({ preventScroll: true });
  });

  // Main panel reveals follow the native gesture continuously. Release only
  // chooses whether the 220 ms FastOutSlowIn settle finishes or returns.
  const interactive =
    'button,input,a,[role="button"],[role="switch"],.settings-card';
  function gestureMode(
    clientY: number,
    target: EventTarget | null,
  ): GestureMode | null {
    if (
      currentScreen !== "homeScreen" ||
      phone.classList.contains("about-open")
    )
      return null;
    if (target instanceof Element && target.closest(interactive)) return null;
    const rect = phone.getBoundingClientRect();
    const y = clientY - rect.top;
    if (y <= rect.height * 0.48) return "settings";
    if (y >= rect.height * 0.52) return "library";
    return null;
  }
  let dragStartY: number | null = null;
  let dragMode: GestureMode | null = null;
  let dragPointerId = -1;
  let libraryDragY: number | null = null;
  let libraryDragPointerId = -1;
  phone.addEventListener("pointerdown", (event) => {
    if (currentScreen === "libraryScreen") {
      if (!(event.target instanceof Element) || !event.target.closest(".library-list"))
        return;
      const rect = phone.getBoundingClientRect();
      const edge = rect.width * 0.13;
      const x = event.clientX - rect.left;
      if (x <= edge || x >= rect.width - edge) {
        libraryDragY = event.clientY;
        libraryDragPointerId = event.pointerId;
        try {
          phone.setPointerCapture?.(event.pointerId);
        } catch {
          // Synthetic PointerEvents have no browser-owned pointer to capture.
        }
      }
      return;
    }
    dragMode = gestureMode(event.clientY, event.target);
    dragStartY = dragMode ? event.clientY : null;
    if (dragMode) {
      dragPointerId = event.pointerId;
      ++settingsMotionEpoch;
      ++libraryMotionEpoch;
      try {
        phone.setPointerCapture?.(event.pointerId);
      } catch {
        // Synthetic PointerEvents have no browser-owned pointer to capture.
      }
    }
  });
  phone.addEventListener("pointermove", (event) => {
    if (libraryDragY != null && event.pointerId === libraryDragPointerId) {
      const rect = phone.getBoundingClientRect();
      const scale = rect.height / Math.max(1, phone.clientHeight);
      if (event.clientY - libraryDragY >= 64 * scale) {
        libraryDragY = null;
        libraryDragPointerId = -1;
        closeLibraryPanel();
      }
      return;
    }
    if (dragStartY == null || !dragMode || event.pointerId !== dragPointerId) return;
    const rect = phone.getBoundingClientRect();
    const deltaY = event.clientY - dragStartY;
    const progress =
      dragMode === "settings"
        ? Math.max(0, deltaY / rect.height)
        : Math.max(0, -deltaY / rect.height);
    if (dragMode === "settings") {
      settingsForegroundScreen = homeScreen;
      renderSettingsPanelProgress(progress);
    } else {
      renderLibraryPanelProgress(progress);
    }
  });
  function finishMainPanelGesture(cancelled = false): void {
    if (dragStartY != null && dragMode) {
      if (dragMode === "settings") {
        const commit =
          !cancelled && settingsPanelProgress >= PANEL_COMMIT_PROGRESS;
        if (commit) {
          settingsReturnScreen = "homeScreen";
          settingsReturnFocus = byId<HTMLElement>("openSettings");
          settingsForegroundScreen = homeScreen;
          prepareSettingsSession();
          settingsPanelOpen = true;
          currentScreen = "settingsScreen";
          activateScreen("settingsScreen");
          blobShader.setVisible(false);
          focusScreen("settingsScreen");
          settleSettingsPanel(1);
        } else {
          settingsPanelOpen = false;
          settleSettingsPanel(0, () => renderSettingsPanelProgress(0));
        }
      } else {
        const commit =
          !cancelled && libraryPanelProgress >= PANEL_COMMIT_PROGRESS;
        if (commit) {
          libraryPanelOpen = true;
          currentScreen = "libraryScreen";
          activateScreen("libraryScreen");
          blobShader.setVisible(false);
          focusScreen("libraryScreen");
          settleLibraryPanel(1);
        } else {
          libraryPanelOpen = false;
          settleLibraryPanel(0, () => renderLibraryPanelProgress(0));
        }
      }
    }
    dragStartY = null;
    dragMode = null;
    dragPointerId = -1;
  }
  const clearGesture = (cancelled = false) => {
    finishMainPanelGesture(cancelled);
    libraryDragY = null;
    libraryDragPointerId = -1;
  };
  phone.addEventListener("pointerup", (event) => {
    if (event.pointerId === dragPointerId) finishMainPanelGesture(false);
    if (event.pointerId === libraryDragPointerId) {
      libraryDragY = null;
      libraryDragPointerId = -1;
    }
  });
  phone.addEventListener("pointercancel", (event) => {
    if (event.pointerId === dragPointerId) finishMainPanelGesture(true);
    if (event.pointerId === libraryDragPointerId) {
      libraryDragY = null;
      libraryDragPointerId = -1;
    }
  });
  const removeBlurListener = addWindowEventListener("blur", () => {
    clearGesture(true);
    cancelRangeWheelInteraction();
    cancelRangeWaveScrub(false);
    finishRangeFineAdjust(true, false);
    blobControl.classList.remove("pressed");
    for (const timer of activeIncidentHoldTimers) clearTimeout(timer);
    activeIncidentHoldTimers.clear();
  });

  // WebGL port of AudioBlobView's RuntimeShader. Formula/constants are kept source-equivalent.
  function resolveCssColor(
    element: Element,
    variable: string,
    fallback: string,
  ) {
    const probe = document.createElement("span");
    probe.style.cssText = `position:absolute;pointer-events:none;visibility:hidden;color:var(${variable},${fallback})`;
    (element.parentNode ?? phone).appendChild(probe);
    const color = getComputedStyle(probe).color || fallback;
    probe.remove();
    return color;
  }

  function makeWebGLBlob(canvas: HTMLCanvasElement): BlobRuntime {
    const context = canvas.getContext("webgl", {
      alpha: true,
      premultipliedAlpha: true,
      antialias: true,
    });
    if (!context) {
      return makeFallbackBlob(canvas);
    }
    const gl: WebGLRenderingContext = context;
    const vs = `attribute vec2 a;void main(){gl_Position=vec4(a,0.0,1.0);}`;
    const precisionInfo = gl.getShaderPrecisionFormat(
      gl.FRAGMENT_SHADER,
      gl.HIGH_FLOAT,
    );
    const fragmentPrecision =
      precisionInfo && precisionInfo.precision ? "highp" : "mediump";
    const fs = `precision ${fragmentPrecision} float;
uniform vec2 resolution;uniform float time;uniform float activity;uniform float life;uniform float active;
uniform vec4 bands0;uniform vec4 bands1;uniform vec4 primaryColor;uniform vec4 tertiaryColor;uniform vec4 pausedColor;
float ssInv(float a,float b,float x){return 1.0-smoothstep(a,b,x);}
void main(){
  float minSize=min(resolution.x,resolution.y);
  vec2 fragCoord=vec2(gl_FragCoord.x,resolution.y-gl_FragCoord.y);
  vec2 p=(fragCoord-resolution*0.5)/minSize;
  float angle=atan(p.y,p.x); float radius=length(p);
  float low=dot(bands0,vec4(0.34,0.30,0.21,0.15));
  float high=dot(bands1,vec4(0.34,0.30,0.21,0.15));
  float h3=sin(angle*3.0+time*0.78); float h7=sin(angle*7.0-time*0.39+1.8);
  float audioWave=h3*low*0.66+h7*high*0.44;
  float idle=h3*0.0056+h7*0.0024;
  float liveRadius=0.330+activity*0.018;
  float baseRadius=mix(0.095,liveRadius,life);
  float blobRadius=baseRadius+active*life*(idle+audioWave*(0.105+activity*0.030));
  float distanceToEdge=radius-blobRadius;
  float body=ssInv(-0.006,0.012,distanceToEdge);
  float glow=active*life*(1.0-body)*ssInv(0.0,0.024,max(distanceToEdge,0.0))*(0.055+activity*0.12);
  float gradientMix=clamp(0.46+p.x*0.9-p.y*0.55,0.0,1.0);
  vec4 activeColor=mix(primaryColor,tertiaryColor,gradientMix);
  float colorLife=smoothstep(0.36,0.86,life);
  vec4 bodyColor=mix(pausedColor,activeColor,colorLife);
  vec4 glowColor=mix(primaryColor,tertiaryColor,0.58);
  float alpha=body+glow;
  vec3 premultiplied=bodyColor.rgb*body+glowColor.rgb*glow;
  gl_FragColor=vec4(premultiplied,alpha);
}`;
    function shader(type: number, src: string) {
      const shader = gl.createShader(type);
      if (!shader) throw new Error("Unable to create Reverb demo shader");
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
        throw new Error(
          gl.getShaderInfoLog(shader) || "Unable to compile Reverb demo shader",
        );
      return shader;
    }
    const prog = gl.createProgram();
    if (!prog) throw new Error("Unable to create Reverb demo shader program");
    gl.attachShader(prog, shader(gl.VERTEX_SHADER, vs));
    gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS))
      throw new Error(
        gl.getProgramInfoLog(prog) || "Unable to link Reverb demo shader",
      );
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    if (!buf) throw new Error("Unable to create Reverb demo vertex buffer");
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const locA = gl.getAttribLocation(prog, "a");
    gl.enableVertexAttribArray(locA);
    gl.vertexAttribPointer(locA, 2, gl.FLOAT, false, 0, 0);
    const u: Uniforms = {};
    [
      "resolution",
      "time",
      "activity",
      "life",
      "active",
      "bands0",
      "bands1",
      "primaryColor",
      "tertiaryColor",
      "pausedColor",
    ].forEach((n) => (u[n] = gl.getUniformLocation(prog, n)));
    const colorCanvas = document.createElement("canvas"),
      colorCtx = colorCanvas.getContext("2d");
    colorCanvas.width = colorCanvas.height = 1;
    function colorVector(
      variable: string,
      fallback: string,
    ): [number, number, number, number] {
      if (!colorCtx) return [0, 0, 0, 1];
      colorCtx.clearRect(0, 0, 1, 1);
      colorCtx.fillStyle = "#000";
      colorCtx.fillStyle = resolveCssColor(canvas, variable, fallback);
      colorCtx.fillRect(0, 0, 1, 1);
      const pixel = colorCtx.getImageData(0, 0, 1, 1).data;
      return [pixel[0] / 255, pixel[1] / 255, pixel[2] / 255, pixel[3] / 255];
    }
    function refreshWebGLTheme() {
      gl.useProgram(prog);
      gl.uniform4fv(u.primaryColor, colorVector("--blob-primary", "#2DD4BF"));
      gl.uniform4fv(u.tertiaryColor, colorVector("--blob-tertiary", "#ACCBE5"));
      gl.uniform4fv(
        u.pausedColor,
        colorVector("--surface-container-highest", "#2A3244"),
      );
    }
    refreshWebGLTheme();
    let targetLife = 1,
      currentLife = 1,
      targetActivity = 0.22,
      currentActivity = 0.22;
    const targetBands = new Float32Array(8),
      currentBands = new Float32Array(8);
    let activeState = true,
      visibleState = true,
      last = performance.now(),
      signalClock = 0,
      frameQueued = false;
    let fallback: BlobRuntime | null = null;
    function failOverTo2d() {
      if (fallback) return fallback;
      fallback = makeFallbackBlob(canvas);
      fallback.setActive(activeState);
      fallback.setVisible(visibleState);
      fallback.refreshTheme();
      return fallback;
    }
    canvas.addEventListener(
      "webglcontextlost",
      () => {
        failOverTo2d();
      },
      { once: true },
    );
    function resize() {
      const dpr = Math.min(runtimeDevicePixelRatio, 2);
      const r = canvas.getBoundingClientRect();
      const w = Math.max(1, Math.round(r.width * dpr)),
        h = Math.max(1, Math.round(r.height * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
      gl.uniform2f(u.resolution, w, h);
    }
    function advance(dt: number) {
      const normalized = Math.max(0.25, Math.min(3, dt * 30));
      let rate = targetActivity > currentActivity ? 0.72 : 0.16;
      let mix = 1 - Math.pow(1 - rate, normalized);
      currentActivity += (targetActivity - currentActivity) * mix;
      for (let i = 0; i < 8; i++) {
        rate = targetBands[i] > currentBands[i] ? 0.68 : 0.13;
        mix = 1 - Math.pow(1 - rate, normalized);
        currentBands[i] += (targetBands[i] - currentBands[i]) * mix;
      }
      rate = targetLife > currentLife ? 0.18 : 0.15;
      mix = 1 - Math.pow(1 - rate, normalized);
      currentLife += (targetLife - currentLife) * mix;
      if (Math.abs(currentLife - targetLife) <= 0.006) currentLife = targetLife;
    }
    function syntheticSignal(ts: number) {
      if (!activeState) {
        targetActivity = 0;
        targetBands.fill(0);
        return;
      }
      if (ts - signalClock < 85) return;
      signalClock = ts;
      const x = ts / 1000;
      targetActivity =
        0.2 + 0.22 * (0.5 + 0.5 * Math.sin(x * 1.7)) + 0.09 * Math.random();
      for (let i = 0; i < 8; i++) {
        const harmonic = 0.5 + 0.5 * Math.sin(x * (1.13 + i * 0.16) + i * 0.83);
        const pulse = 0.5 + 0.5 * Math.sin(x * 0.41 + i * 1.7);
        targetBands[i] = Math.max(
          0.025,
          Math.min(
            0.82,
            0.07 +
              harmonic * (0.12 + 0.21 * targetActivity) +
              pulse * 0.07 +
              Math.random() * 0.09,
          ),
        );
      }
    }
    const queueFrame = () => {
      if (visibleState && !fallback && !frameQueued) {
        frameQueued = true;
        requestAnimationFrame(frame);
      }
    };
    function frame(now: number) {
      frameQueued = false;
      if (!visibleState || fallback) return;
      if (gl.isContextLost()) {
        failOverTo2d();
        return;
      }
      resize();
      const dt = Math.max(0.001, Math.min(0.1, (now - last) / 1000));
      last = now;
      syntheticSignal(now);
      advance(dt);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(prog);
      gl.uniform1f(u.time, now / 1000);
      gl.uniform1f(u.activity, currentActivity);
      gl.uniform1f(u.life, currentLife);
      gl.uniform1f(u.active, activeState ? 1 : 0);
      gl.uniform4fv(u.bands0, currentBands.subarray(0, 4));
      gl.uniform4fv(u.bands1, currentBands.subarray(4, 8));
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      queueFrame();
    }
    queueFrame();
    return {
      setActive(v: boolean) {
        activeState = v;
        targetLife = v ? 1 : 0.38;
        if (!v) {
          targetActivity = 0;
          targetBands.fill(0);
        }
        fallback?.setActive(v);
      },
      setVisible(v: boolean) {
        visibleState = v;
        fallback?.setVisible(v);
        if (v) {
          last = performance.now();
          queueFrame();
        }
      },
      refreshTheme() {
        if (fallback) fallback.refreshTheme();
        else refreshWebGLTheme();
      },
      currentBaseRadiusFraction() {
        return fallback?.currentBaseRadiusFraction() ??
          0.095 + currentLife * (0.235 + currentActivity * 0.018);
      },
    };
  }
  function makeBlobShader(canvas: HTMLCanvasElement): BlobRuntime {
    try {
      return makeWebGLBlob(canvas);
    } catch (error) {
      console.warn("Reverb demo WebGL unavailable; using 2D fallback", error);
      return makeFallbackBlob(canvas);
    }
  }

  function makeFallbackBlob(sourceCanvas: HTMLCanvasElement): BlobRuntime {
    let canvas = sourceCanvas,
      ctx = canvas.getContext("2d");
    if (!ctx && canvas.parentNode) {
      // Once a WebGL context has been created the same canvas cannot switch to
      // 2D. Replace it so shader/link failures still get the animated fallback.
      const replacement = canvas.cloneNode(false);
      if (!(replacement instanceof HTMLCanvasElement))
        throw new Error("Unable to clone Reverb demo canvas");
      canvas.replaceWith(replacement);
      canvas = replacement;
      ctx = canvas.getContext("2d");
    }
    if (!ctx) {
      canvas.style.background =
        "radial-gradient(circle at 45% 42%,color-mix(in srgb,var(--blob-primary) 90%,transparent) 0 13%,color-mix(in srgb,var(--blob-tertiary) 45%,transparent) 22%,transparent 42%)";
      let active = true;
      return {
        setActive(v: boolean) {
          active = v;
          canvas.style.opacity = v ? "1" : ".56";
        },
        setVisible() {},
        refreshTheme() {},
        currentBaseRadiusFraction() {
          return active ? 0.334 : 0.1843;
        },
      };
    }
    const context2d: CanvasRenderingContext2D = ctx;
    let primaryColor = "#2DD4BF",
      tertiaryColor = "#ACCBE5",
      pausedColor = "#2A3244";
    function refreshTheme() {
      primaryColor = resolveCssColor(canvas, "--blob-primary", "#2DD4BF");
      tertiaryColor = resolveCssColor(canvas, "--blob-tertiary", "#ACCBE5");
      pausedColor = resolveCssColor(
        canvas,
        "--surface-container-highest",
        "#2A3244",
      );
    }
    refreshTheme();
    let targetLife = 1,
      currentLife = 1,
      targetActivity = 0.22,
      currentActivity = 0.22,
      activeState = true,
      visibleState = true,
      last = performance.now(),
      signalClock = 0,
      frameQueued = false;
    const targetBands = new Float32Array(8),
      currentBands = new Float32Array(8),
      x = new Float32Array(40),
      y = new Float32Array(40);
    function syntheticSignal(ts: number) {
      if (!activeState) {
        targetActivity = 0;
        targetBands.fill(0);
        return;
      }
      if (ts - signalClock < 85) return;
      signalClock = ts;
      const x = ts / 1000;
      targetActivity =
        0.2 + 0.22 * (0.5 + 0.5 * Math.sin(x * 1.7)) + 0.09 * Math.random();
      for (let i = 0; i < 8; i++) {
        const harmonic = 0.5 + 0.5 * Math.sin(x * (1.13 + i * 0.16) + i * 0.83),
          pulse = 0.5 + 0.5 * Math.sin(x * 0.41 + i * 1.7);
        targetBands[i] = Math.max(
          0.025,
          Math.min(
            0.82,
            0.07 +
              harmonic * (0.12 + 0.21 * targetActivity) +
              pulse * 0.07 +
              Math.random() * 0.09,
          ),
        );
      }
    }
    function advance(dt: number) {
      const normalized = Math.max(0.25, Math.min(3, dt * 30));
      let rate = targetActivity > currentActivity ? 0.34 : 0.16,
        mix = Math.min(0.82, rate * normalized);
      currentActivity += (targetActivity - currentActivity) * mix;
      for (let i = 0; i < 8; i++) {
        rate = targetBands[i] > currentBands[i] ? 0.3 : 0.13;
        mix = Math.min(0.8, rate * normalized);
        currentBands[i] += (targetBands[i] - currentBands[i]) * mix;
      }
      rate = targetLife > currentLife ? 0.18 : 0.15;
      mix = Math.min(0.65, rate * normalized);
      currentLife += (targetLife - currentLife) * mix;
      if (Math.abs(currentLife - targetLife) <= 0.006) currentLife = targetLife;
    }
    const queueFrame = () => {
      if (visibleState && !frameQueued) {
        frameQueued = true;
        requestAnimationFrame(frame);
      }
    };
    function frame(now: number) {
      frameQueued = false;
      if (!visibleState) return;
      const r = canvas.getBoundingClientRect(),
        dpr = Math.min(runtimeDevicePixelRatio, 2),
        w = Math.max(1, Math.round(r.width * dpr)),
        h = Math.max(1, Math.round(r.height * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      const dt = Math.max(0.001, Math.min(0.1, (now - last) / 1000));
      last = now;
      syntheticSignal(now);
      advance(dt);
      context2d.clearRect(0, 0, w, h);
      const min = Math.min(w, h),
        cx = w * 0.5,
        cy = h * 0.5,
        base = min * (0.095 + currentLife * (0.235 + currentActivity * 0.018));
      for (let i = 0; i < 40; i++) {
        const angle = (i / 40) * Math.PI * 2 - Math.PI / 2,
          band = currentBands[Math.floor((i * 8) / 40)];
        const idle = activeState
          ? Math.sin(angle * 3 + (now / 1000) * 0.8) * min * 0.005 +
            Math.sin(angle * 5 - (now / 1000) * 0.55) * min * 0.0025
          : 0;
        const radius = base + (activeState ? band * min * 0.105 + idle : 0);
        x[i] = cx + Math.cos(angle) * radius;
        y[i] = cy + Math.sin(angle) * radius;
      }
      context2d.beginPath();
      context2d.moveTo((x[0] + x[1]) * 0.5, (y[0] + y[1]) * 0.5);
      for (let i = 1; i <= 40; i++) {
        const cur = i % 40,
          next = (i + 1) % 40;
        context2d.quadraticCurveTo(
          x[cur],
          y[cur],
          (x[cur] + x[next]) * 0.5,
          (y[cur] + y[next]) * 0.5,
        );
      }
      context2d.closePath();
      if (activeState) {
        const g = context2d.createLinearGradient(0, 0, w, h);
        g.addColorStop(0, primaryColor);
        g.addColorStop(1, tertiaryColor);
        context2d.fillStyle = g;
      } else context2d.fillStyle = pausedColor;
      context2d.fill();
      queueFrame();
    }
    queueFrame();
    return {
      setActive(v: boolean) {
        activeState = v;
        targetLife = v ? 1 : 0.38;
        if (!v) {
          targetActivity = 0;
          targetBands.fill(0);
        }
      },
      setVisible(v: boolean) {
        visibleState = v;
        if (v) {
          last = performance.now();
          queueFrame();
        }
      },
      refreshTheme,
      currentBaseRadiusFraction() {
        return 0.095 + currentLife * (0.235 + currentActivity * 0.018);
      },
    };
  }
  return {
    refreshTheme() {
      blobShader.refreshTheme?.();
    },
    setDevicePixelRatio(value: number) {
      syncDevicePixelRatio(value);
    },
    dispose() {
      removeResizeListener();
      removeBlurListener();
    },
  };
}
