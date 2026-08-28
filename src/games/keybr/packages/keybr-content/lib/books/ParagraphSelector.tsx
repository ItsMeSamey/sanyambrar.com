import { getDir } from "@keybr/intl";
import { Field, FieldList, Icon, IconButton, Range } from "@keybr/widget";
import { mdiSkipNext, mdiSkipPrevious } from "@keybr/solid-compat/mdi";
import { type ReactNode } from "@keybr/solid-compat/react";
import { useIntl } from "@keybr/solid-compat/intl";
import { ParagraphIndex } from "./ParagraphPreview.tsx";
export function ParagraphSelector({ paragraphs, paragraphIndex, onChange, }: {
    readonly paragraphs: readonly string[];
    readonly paragraphIndex: number;
    readonly onChange: (paragraphIndex: number) => void;
}): ReactNode {
    const { locale } = useIntl();
    const rtl = getDir(locale) === "rtl";
    return (<FieldList>
      <Field>Paragraph:</Field>
      <Field>
        <ParagraphIndex paragraphIndex={paragraphIndex}/>
      </Field>
      <Field>
        <Range size={32} min={0} max={paragraphs.length - 1} step={1} value={paragraphIndex} onChange={onChange}/>
      </Field>
      <Field>
        <span style={{ display: "contents" }}>
          <IconButton icon={<Icon shape={rtl ? mdiSkipNext : mdiSkipPrevious}/>} disabled={paragraphIndex === 0} onClick={() => {
            if (paragraphIndex > 0) {
                onChange(paragraphIndex - 1);
            }
        }}/>
          <IconButton icon={<Icon shape={rtl ? mdiSkipPrevious : mdiSkipNext}/>} disabled={paragraphIndex === paragraphs.length - 1} onClick={() => {
            if (paragraphIndex < paragraphs.length - 1) {
                onChange(paragraphIndex + 1);
            }
        }}/>
        </span>
      </Field>
    </FieldList>);
}
