import {
  styleSizeFill,
  styleSizeFillAlt,
  styleSizeFit,
} from "../../styles/size.ts";
import * as boxStyles from "./Box.module.less";
import {
  type BoxAlignContent,
  type BoxAlignItems,
  type BoxDirection,
  type BoxJustifyContent,
  type BoxProps,
  type BoxWrap,
} from "./Box.types.ts";

const directionMapping: { readonly [key in BoxDirection]: string } = {
  row: boxStyles.hFlex,
  column: boxStyles.vFlex,
};
const wrapMapping: { readonly [key in BoxWrap]: string } = {
  "wrap": boxStyles.flexWrap,
  "wrap-reverse": boxStyles.flexWrapReverse,
  "nowrap": boxStyles.flexNoWrap,
};
const justifyContentMapping: { readonly [key in BoxJustifyContent]: string } = {
  "start": boxStyles.justifyContentStart,
  "end": boxStyles.justifyContentEnd,
  "center": boxStyles.justifyContentCenter,
  "space-between": boxStyles.justifyContentSpaceBetween,
  "space-around": boxStyles.justifyContentSpaceAround,
};
const alignItemsMapping: { readonly [key in BoxAlignItems]: string } = {
  start: boxStyles.alignItemsStart,
  end: boxStyles.alignItemsEnd,
  center: boxStyles.alignItemsCenter,
  baseline: boxStyles.alignItemsBaseline,
  stretch: boxStyles.alignItemsStretch,
};
const alignContentMapping: { readonly [key in BoxAlignContent]: string } = {
  "start": boxStyles.alignContentStart,
  "end": boxStyles.alignContentEnd,
  "center": boxStyles.alignContentCenter,
  "space-between": boxStyles.alignContentSpaceBetween,
  "space-around": boxStyles.alignContentSpaceAround,
  "stretch": boxStyles.alignContentStretch,
};
export function getBoxClassNames({
  direction,
  wrap,
  justifyContent,
  alignItems,
  alignContent,
}: BoxProps): string[] {
  const classNames: string[] = [directionMapping[direction ?? "row"]];
  if (wrap != null) {
    classNames.push(wrapMapping[wrap]);
  }
  if (justifyContent != null) {
    classNames.push(justifyContentMapping[justifyContent]);
  }
  if (alignItems != null) {
    classNames.push(alignItemsMapping[alignItems]);
  }
  if (alignContent != null) {
    classNames.push(alignContentMapping[alignContent]);
  }
  return classNames;
}
