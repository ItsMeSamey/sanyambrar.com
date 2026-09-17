import { type ClassName } from "../components/index.ts";
import * as styles from "./text.module.css";

const styleTextCenter = styles.textCenter;
const styleTextStart = styles.textStart;
const styleTextEnd = styles.textEnd;
export const styleTextTruncate = styles.textTruncate;

export type AlignName = "start" | "center" | "end";

export const alignClassName = (value?: AlignName | null): ClassName => {
  switch (value) {
    case "start":
      return styleTextStart;
    case "center":
      return styleTextCenter;
    case "end":
      return styleTextEnd;
  }
  return undefined;
};
