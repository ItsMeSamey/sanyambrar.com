import { type ClassName } from "../components/types.ts";
import styles from "./size.module.css";

export const styleSizeFill = styles.sizeFill;
const styleSizeFillAlt = styles.sizeFillAlt;
const styleSizeFull = styles.sizeFull;

const styleWidth6 = styles.width6;
const styleWidth10 = styles.width10;
const styleWidth16 = styles.width16;
const styleWidth24 = styles.width24;
const styleWidth32 = styles.width32;

export type SizeName =
  | "default"
  | "fill"
  | "fillAlt"
  | "full"
  | 6
  | 10
  | 16
  | 24
  | 32;

export const sizeClassName = (value?: SizeName | null): ClassName => {
  switch (value) {
    case "fill":
      return styleSizeFill;
    case "fillAlt":
      return styleSizeFillAlt;
    case "full":
      return styleSizeFull;
    case 6:
      return styleWidth6;
    case 10:
      return styleWidth10;
    case 16:
      return styleWidth16;
    case 24:
      return styleWidth24;
    case 32:
      return styleWidth32;
  }
  return undefined;
};
