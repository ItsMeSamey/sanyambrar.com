import { type AlignName } from "../../styles/index.ts";
import { type ElementProps } from "../types.ts";

export type ParaProps = ElementProps & { readonly align?: AlignName };
