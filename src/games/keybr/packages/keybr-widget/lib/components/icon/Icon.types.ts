import { type LucideIcon } from '../../../../../../../ui-kit/components/lucide.tsx';
import { type ClassName, type MouseProps } from "../types.ts";

export type IconProps = {
  readonly shape: string | LucideIcon;
  readonly className?: ClassName;
  readonly viewBox?: string;
} & MouseProps;
