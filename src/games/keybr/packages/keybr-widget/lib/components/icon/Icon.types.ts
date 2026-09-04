import { type LucideIcon } from "lucide-solid";
import { type ClassName, type MouseProps } from "../types.ts";

export type IconProps = {
  readonly shape: string | LucideIcon;
  readonly className?: ClassName;
  readonly viewBox?: string;
} & MouseProps;
