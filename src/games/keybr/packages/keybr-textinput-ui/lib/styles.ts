import type { JSX } from "@solidjs/web";
import { Attr } from "@keybr/textinput";

export const textItemStyle = {
    display: "inline-block",
    "white-space": "nowrap",
} satisfies JSX.CSSProperties;
const textStyles = {
    normal: {
        color: "var(--textinput__color)",
    } satisfies JSX.CSSProperties,
    special: {
        color: "var(--textinput--special__color)",
    } satisfies JSX.CSSProperties,
    hit: {
        color: "var(--textinput--hit__color)",
    } satisfies JSX.CSSProperties,
    miss: {
        color: "var(--textinput--miss__color)",
    } satisfies JSX.CSSProperties,
    garbage: {
        color: "var(--textinput__color)",
        "background-color": "var(--textinput--miss__color)",
    } satisfies JSX.CSSProperties,
} as const;
const syntaxStyles = {
    keyword: { color: "var(--syntax-keyword)" },
    string: { color: "var(--syntax-string)" },
    number: { color: "var(--syntax-number)" },
    comment: { color: "var(--syntax-comment)" },
} as Record<string, JSX.CSSProperties>;
export function getTextStyle({ attrs, cls, }: {
    readonly attrs: number;
    readonly cls: string | null;
}, special: boolean): JSX.CSSProperties | undefined {
    switch (attrs) {
        case Attr.Normal:
        case Attr.Cursor: {
            return (syntaxStyles[cls ?? ""] ??
                (special ? textStyles.special : textStyles.normal));
        }
        case Attr.Hit:
            return textStyles.hit;
        case Attr.Miss:
            return textStyles.miss;
        case Attr.Garbage:
            return textStyles.garbage;
    }
    return undefined;
}
