import { type AlignName } from "../../styles/text.ts";
import { type ElementProps } from "../types.ts";

export type ParaProps = ElementProps & { readonly align?: AlignName };
