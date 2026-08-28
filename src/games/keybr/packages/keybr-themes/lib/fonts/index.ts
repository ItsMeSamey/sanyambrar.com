import { type CSSProperties } from "@keybr/solid-compat/react";
export type FontWeight = "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900";
export type FontStyle = "normal" | "italic";
export type Fallback = "cursive" | "fantasy" | "monospace" | "sans-serif" | "serif" | string;
export type Script = "arabic" | "cyrillic" | "greek" | "hebrew" | "hiragana" | "katakana" | "latin" | "thai";
export class FontFace {
    readonly family: string;
    readonly weight: FontWeight;
    readonly style: FontStyle;
    readonly fallbacks: readonly Fallback[];
    readonly scripts: readonly Script[];
    readonly name: string;
    readonly cssProperties: CSSProperties;
    constructor(family: string, weight: FontWeight, style: FontStyle, fallbacks: readonly Fallback[], scripts: readonly Script[]) {
        this.family = family;
        this.weight = weight;
        this.style = style;
        this.fallbacks = fallbacks;
        this.scripts = scripts;
        this.name = fontName(family, weight, style);
        this.cssProperties = {
            fontFamily: [family, ...fallbacks].join(","),
            fontWeight: weight,
            fontStyle: style,
        };
    }
}
const allScripts = [
    "arabic",
    "cyrillic",
    "greek",
    "hebrew",
    "hiragana",
    "katakana",
    "latin",
    "thai",
] as const satisfies readonly Script[];
const face = (family: string, weight: FontWeight, style: FontStyle, fallback: Fallback) => new FontFace(family, weight, style, [fallback], allScripts);
export const SANS_SERIF = face("sans-serif", "400", "normal", "sans-serif");
export const SANS_SERIF_I = face("sans-serif", "400", "italic", "sans-serif");
export const SANS_SERIF_B = face("sans-serif", "700", "normal", "sans-serif");
export const SANS_SERIF_BI = face("sans-serif", "700", "italic", "sans-serif");
export const SERIF = face("serif", "400", "normal", "serif");
export const SERIF_I = face("serif", "400", "italic", "serif");
export const SERIF_B = face("serif", "700", "normal", "serif");
export const SERIF_BI = face("serif", "700", "italic", "serif");
export const MONOSPACE = face("monospace", "400", "normal", "monospace");
export const MONOSPACE_I = face("monospace", "400", "italic", "monospace");
export const MONOSPACE_B = face("monospace", "700", "normal", "monospace");
export const MONOSPACE_BI = face("monospace", "700", "italic", "monospace");
export const CURSIVE = face("cursive", "400", "normal", "cursive");
export const CURSIVE_I = face("cursive", "400", "italic", "cursive");
export const CURSIVE_B = face("cursive", "700", "normal", "cursive");
export const CURSIVE_BI = face("cursive", "700", "italic", "cursive");
// Kept as a compatibility alias because the text-input package historically
// selected Ubuntu Mono as its default face. The local build intentionally uses
// the platform monospace stack and ships no web-font files.
export const UBUNTU_MONO = MONOSPACE;
export const FONTS_FACES: readonly FontFace[] = [
    MONOSPACE,
    MONOSPACE_I,
    MONOSPACE_B,
    MONOSPACE_BI,
    SANS_SERIF,
    SANS_SERIF_I,
    SANS_SERIF_B,
    SANS_SERIF_BI,
    SERIF,
    SERIF_I,
    SERIF_B,
    SERIF_BI,
    CURSIVE,
    CURSIVE_I,
    CURSIVE_B,
    CURSIVE_BI,
];
function fontName(family: string, weight: FontWeight, style: FontStyle): string {
    const weightName = weight === "700" ? "Bold" : weight === "400" ? "Regular" : weight;
    const styleName = style === "italic" ? "Italic" : "Regular";
    if (weightName === "Regular" && styleName === "Regular") {
        return family;
    }
    if (weightName === "Regular") {
        return `${family} (${styleName})`;
    }
    if (styleName === "Regular") {
        return `${family} (${weightName})`;
    }
    return `${family} (${weightName} ${styleName})`;
}
