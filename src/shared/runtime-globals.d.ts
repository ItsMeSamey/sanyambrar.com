export {};

type NavigationDirection = "forward" | "back";
type NavigationOptions = { replace?: boolean; force?: boolean; direction?: NavigationDirection };
type AppearanceSnapshot = { readonly color: string; readonly font: string };

type AppearanceColorConfig = {
  label: string; tone: "light" | "dark"; background: string; text: string;
  accent: string; error: string; warning: string; slow: string; fast: string; effort: string;
  blurTint: string; shadowTint: string;
};
type AppearanceFontConfig = { label: string; stack: string };
type AppearanceConfig = { colors: Record<string, AppearanceColorConfig>; fonts: Record<string, AppearanceFontConfig> };

declare global {
  interface DocumentEventMap { pointerrawupdate: PointerEvent; }
  var SameyAppearanceConfig: AppearanceConfig | undefined;
  var SameyOpenAppearance: ((trigger: HTMLElement) => void) | undefined;
  var SameyLoadingSvg: (() => string) | undefined;
  var SameyAnimateLocalSwap: ((root: HTMLElement, commit: () => void | Promise<void>, direction?: NavigationDirection) => Promise<void>) | undefined;
  var SameyAppearance: ({ get(): AppearanceSnapshot }) | undefined;
  var SameyLoading: ((loading: boolean) => void) | undefined;
  var SameyLoadingBegin: (() => () => void) | undefined;
  var SameyLoadingBeginAfterDelay: ((delay?: number) => () => void) | undefined;
  var SameyCancelPageSwap: (() => void) | undefined;
  var SameyPageSwapNavigate: ((href: string, options?: NavigationOptions) => Promise<void>) | undefined;
  var SameyNavigate: ((href: string, options?: NavigationOptions) => Promise<void> | void) | undefined;
  var SameyPreloadPage: ((href: string) => void) | undefined;
  var SameySolidNavigate: ((href: string, replace?: boolean, direction?: NavigationDirection) => Promise<void>) | undefined;
  var SameySolidPreload: ((href: string) => void) | undefined;
  var SameyMountSolid: (() => void) | undefined;
  var SameySolidDispose: (() => void) | undefined;
  var SameyToolsDispose: (() => void) | undefined;
  var SameyWordleDispose: (() => void) | undefined;
  var SameyKeybrDispose: (() => void) | undefined;
}
