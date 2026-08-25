import "./Box.module.less";
import { clsx } from "clsx";
import { type ReactNode } from "react";
import { type BoxProps, type HBoxProps, type VBoxProps } from "./Box.types.ts";
import { getBoxClassNames } from "./classNames.ts";

export function Box(props: BoxProps): ReactNode {
  const { as: Component = "div", className, id, title, children } = props;
  return (
    <Component
      id={id}
      className={clsx(getBoxClassNames(props), className)}
      title={title}
    >
      {children}
    </Component>
  );
}
