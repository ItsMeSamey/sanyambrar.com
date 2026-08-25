import { clsx } from "clsx";
import { type ReactNode } from "react";
import { alignClassName } from "../../styles/index.ts";
import { type ParaProps } from "./Para.types.ts";

export function Para(props: ParaProps): ReactNode {
  const { as: Component = "p", id, title, className, children, align } = props;
  return (
    <Component
      id={id}
      className={clsx(alignClassName(align), className)}
      title={title}
    >
      {children}
    </Component>
  );
}
