import { Field, FieldList, OptionList } from "@keybr/widget";
import { type ReactNode } from "@keybr/solid-compat/react";
import { Book } from "./book.ts";
export function BookSelector(solidProps: {
    readonly book: Book;
    readonly onChange: (book: Book) => void;
}): ReactNode {
    return (<FieldList>
      <Field>Book:</Field>
      <Field>
        <OptionList size={24} options={Book.ALL.map(({ id, title }) => ({
            value: id,
            name: title,
        }))} value={solidProps.book.id} onSelect={(value) => {
            solidProps.onChange(Book.ALL.get(value));
        }}/>
      </Field>
    </FieldList>);
}
