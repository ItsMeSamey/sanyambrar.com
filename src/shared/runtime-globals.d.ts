export {};

declare global {
  var SameyAnimateLocalSwap: ((root: HTMLElement, commit: () => void | Promise<void>, direction?: "forward" | "back") => Promise<void>) | undefined;
  var SameyWordleDispose: (() => void) | undefined;
  var SameyKeybrDispose: (() => void) | undefined;
}
