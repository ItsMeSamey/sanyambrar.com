import { parseColor } from "../color/parse.ts";
import { type GraphicsStyle } from "../widget/components/canvas/graphics-style.ts";
import { type ClassValue, clsx } from "clsx";
import { useTheme } from "./context.ts";
type PropName =
    | "--slow-key-color"
    | "--fast-key-color"
    | "--slow-key-background-color"
    | "--fast-key-background-color"
    | "--effort-color"
    | "--Calendar-cell--background-color";
export const useComputedStyles = () => {
    const theme = useTheme();
    const element = document.body;
    const getPropertyValue = (name: PropName): string => {
        theme();
        return getComputedStyle(element).getPropertyValue(name);
    };
    const resolveColor = (name: PropName, fallback: string): string => {
        theme();
        const child = document.createElement("span");
        child.style.color = `var(${name}, ${fallback})`;
        element.appendChild(child);
        const value = getComputedStyle(child).color || fallback;
        element.removeChild(child);
        return value;
    };
    const computeStyle = (...className: ClassValue[]): GraphicsStyle => {
        theme();
        // https://developer.mozilla.org/en-US/docs/Web/API/Window/getComputedStyle
        // The returned style is a live CSSStyleDeclaration object, which updates itself automatically
        // when the element's style is changed.
        // The values returned by getComputedStyle are known as resolved values. These are usually the
        // same as the CSS 2.1 computed values, but for some older properties like width, height or
        // padding, they are instead the used values.
        const child = createElement("div", className);
        element.appendChild(child);
        const { font, fontStyle, fontVariant, fontWeight, fontSize, lineHeight, fontFamily, textAlign, verticalAlign, fill, fillOpacity, fillRule, stroke, strokeLinecap, strokeLinejoin, strokeMiterlimit, strokeOpacity, strokeWidth } = getComputedStyle(child);
        element.removeChild(child);
        const result: GraphicsStyle = {};
        if (font != null) {
            if (font.length > 0) {
                result.font = font;
            }
            else {
                // A fix for Firefox in which the font property is an empty string.
                result.font = `${fontStyle} ${fontVariant} ${fontWeight} ${fontSize} / ${lineHeight} ${fontFamily}`;
            }
        }
        switch (textAlign) {
            case "left":
                result.textAlign = "left";
                break;
            case "right":
                result.textAlign = "right";
                break;
            case "center":
                result.textAlign = "center";
                break;
            case "start":
                result.textAlign = "start";
                break;
            case "end":
                result.textAlign = "end";
                break;
        }
        switch (verticalAlign) {
            case "top":
                result.textBaseline = "top";
                break;
            case "baseline":
                result.textBaseline = "alphabetic";
                break;
            case "middle":
                result.textBaseline = "middle";
                break;
            case "bottom":
                result.textBaseline = "bottom";
                break;
        }
        if (fill != null && fill !== "none") {
            try {
                const color = parseColor(fill).toRgb();
                if (fillOpacity != null) {
                    const value = Number(fillOpacity);
                    if (value !== 1) {
                        color.alpha = value;
                    }
                }
                result.fillStyle = color;
            }
            catch {
                // Ignore.
            }
        }
        switch (fillRule) {
            case "nonzero":
            case "evenodd":
                result.fillRule = fillRule;
                break;
        }
        if (stroke != null && stroke !== "none") {
            try {
                const color = parseColor(stroke).toRgb();
                if (strokeOpacity != null) {
                    const value = Number(strokeOpacity);
                    if (value !== 1) {
                        color.alpha = value;
                    }
                }
                result.strokeStyle = color;
            }
            catch {
                // Ignore.
            }
        }
        switch (strokeLinecap) {
            case "butt":
            case "round":
            case "square":
                result.lineCap = strokeLinecap;
                break;
        }
        switch (strokeLinejoin) {
            case "bevel":
            case "round":
            case "miter":
                result.lineJoin = strokeLinejoin;
                break;
        }
        if (strokeWidth != null && isPx(strokeWidth)) {
            result.lineWidth = parsePx(strokeWidth);
        }
        if (strokeMiterlimit != null) {
            result.miterLimit = Number(strokeMiterlimit);
        }
        return result;
    };
    const computeLineHeight = (...className: ClassValue[]): number => {
        theme();
        const child = createElement("p", className);
        child.style.lineHeight = "1";
        element.appendChild(child);
        const value = child.clientHeight;
        element.removeChild(child);
        return value;
    };
    return { getPropertyValue, resolveColor, computeStyle, computeLineHeight };
};
const createElement = (tagName: string, className: ClassValue): HTMLElement => {
    const element = document.createElement(tagName);
    element.textContent = "?";
    element.className = clsx(className);
    element.style.position = "fixed";
    element.style.insetInlineStart = "0px";
    element.style.insetBlockStart = "0px";
    return element;
};
const isPx = (value: string): boolean => {
    return value.endsWith("px");
};
const parsePx = (value: string): number => {
    return Number(value.substring(0, value.length - 2));
};
