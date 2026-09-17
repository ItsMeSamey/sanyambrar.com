import type { JSX } from "@solidjs/web";
import { getDir } from "../../intl/locale.ts";
import { Field, FieldList } from "../../widget/components/fieldlist/FieldList.tsx";
import { Icon } from "../../widget/components/icon/Icon.tsx";
import { IconButton } from "../../widget/components/button/IconButton.tsx";
import { Range } from "../../widget/components/range/Range.tsx";
import { SkipForward, SkipBack } from "../../widget/icons.ts";

import { useIntl } from "../../intl/runtime.tsx";
import { ParagraphIndex } from "./ParagraphPreview.tsx";
export function ParagraphSelector(props: {
    readonly paragraphs: readonly string[];
    readonly paragraphIndex: number;
    readonly onChange: (paragraphIndex: number) => void;
}): JSX.Element {
    const { locale } = useIntl();
    const rtl = getDir(locale) === "rtl";
    return (<FieldList>
      <Field>Paragraph:</Field>
      <Field>
        <ParagraphIndex paragraphIndex={props.paragraphIndex}/>
      </Field>
      <Field>
        <Range size={32} min={0} max={props.paragraphs.length - 1} step={1} value={props.paragraphIndex} onChange={props.onChange}/>
      </Field>
      <Field>
        <span style={{ display: "contents" }}>
          <IconButton icon={<Icon shape={rtl ? SkipForward : SkipBack}/>} disabled={props.paragraphIndex === 0} onClick={() => {
            if (props.paragraphIndex > 0) {
                props.onChange(props.paragraphIndex - 1);
            }
        }}/>
          <IconButton icon={<Icon shape={rtl ? SkipBack : SkipForward}/>} disabled={props.paragraphIndex === props.paragraphs.length - 1} onClick={() => {
            if (props.paragraphIndex < props.paragraphs.length - 1) {
                props.onChange(props.paragraphIndex + 1);
            }
        }}/>
        </span>
      </Field>
    </FieldList>);
}
