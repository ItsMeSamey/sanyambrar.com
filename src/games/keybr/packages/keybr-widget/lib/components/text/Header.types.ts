import { type ElementProps } from "../types.ts";

export type HeaderProps = ElementProps & { readonly level?: 1 | 2 | 3 | 4 | 5 };
