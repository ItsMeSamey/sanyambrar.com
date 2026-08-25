import { clsx } from "clsx";
import { type ReactNode } from "react";
import { type LinkProps } from "./Link.types.ts";

export function Link({
  as: Component = "a",
  id,
  className,
  href,
  target,
  download,
  title,
  children,
  ...props
}: LinkProps): ReactNode {
  return (
    <Component
      {...props}
      id={id}
      className={className}
      href={href}
      target={target}
      download={download}
      title={title}
    >
      {children}
    </Component>
  );
}
