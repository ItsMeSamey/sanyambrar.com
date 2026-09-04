export {};

type NavigationDirection = "forward" | "back";
type NavigationOptions = { replace?: boolean; force?: boolean; direction?: NavigationDirection };
type AppearanceSnapshot = { readonly color: string; readonly font: string };

declare global {
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
