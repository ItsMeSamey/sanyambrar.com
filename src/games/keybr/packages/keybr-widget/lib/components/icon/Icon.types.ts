import { type ClassName, type MouseProps } from "../types.ts";

export type IconProps = {
  readonly shape: string | ((props: any) => any);
  readonly className?: ClassName;
  readonly viewBox?: string;
} & MouseProps;
