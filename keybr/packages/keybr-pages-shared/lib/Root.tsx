import { type ReactNode } from "react";

export function Root({
  children,
}: {
  readonly children?: ReactNode;
}): ReactNode {
  return <div id="keybr-root">{children}</div>;
}

Root.selector = "#keybr-root";
